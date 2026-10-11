import { randomBytes } from "node:crypto";
import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import { type RawData, type WebSocket, WebSocketServer } from "ws";
import { $log } from "@tsed/logger";
import { Feature, RadioTransport } from "@prisma/client";
import {
  type ChannelMode,
  type ClientMessage,
  type RadioMember,
  type RadioTransport as WireTransport,
  type ServerMessage,
  MAX_FRAMES_PER_SECOND,
  RADIO_WS_PATH,
  decodeAudioFrame,
  livekitRoomName,
  parseClientMessage,
  withHandle,
} from "@snailycad/radio";
import { prisma } from "lib/data/prisma";
import { type RadioAccess, resolveRadioAccess } from "./access";
import { getLiveKitConfig } from "./config";
import { type RadioTokenClaims, signLiveKitToken, verifyRadioToken } from "./tokens";

/** a stuck push-to-talk is released after this long */
const MAX_TRANSMIT_MS = 60_000;
const HELLO_TIMEOUT_MS = 10_000;
const HEARTBEAT_MS = 30_000;
const SETTINGS_CACHE_MS = 10_000;
const MAX_HANDLE = 0xffff;

interface JoinedChannel {
  handle: number;
  mode: ChannelMode;
}

interface Session {
  connectionId: string;
  socket: WebSocket;
  claims: RadioTokenClaims | null;
  access: RadioAccess | null;
  joined: Map<string, JoinedChannel>;
  handles: Map<number, string>;
  nextHandle: number;
  earpiece: boolean;
  speaker: boolean;
  frameWindow: number;
  frameCount: number;
  alive: boolean;
  /** control messages are handled one after another, in order */
  queue: Promise<void>;
}

interface ChannelState {
  id: string;
  sessions: Set<Session>;
  talker: Session | null;
  talkTimer: ReturnType<typeof setTimeout> | null;
}

export interface RadioChannelStatus {
  id: string;
  members: RadioMember[];
  listeners: number;
  talking: { id: string; name: string } | null;
}

export class RadioServer {
  #wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024, perMessageDeflate: false });
  #sessions = new Set<Session>();
  #channels = new Map<string, ChannelState>();
  #heartbeat: ReturnType<typeof setInterval> | null = null;
  #settings: { enabled: boolean; transport: WireTransport; at: number } | null = null;
  #attached = false;

  /** handles WebSocket upgrades on /v1/radio/ws; all other upgrades (socket.io) are left alone */
  attach(server: HttpServer) {
    if (this.#attached) return;
    this.#attached = true;

    server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      const pathname = (request.url ?? "").split("?")[0]?.replace(/\/+$/, "");
      if (pathname !== RADIO_WS_PATH) return;
      this.#wss.handleUpgrade(request, socket, head, (ws) => this.#onConnection(ws));
    });

    this.#heartbeat = setInterval(() => {
      for (const session of this.#sessions) {
        if (!session.alive) {
          session.socket.terminate();
          continue;
        }
        session.alive = false;
        session.socket.ping();
      }
    }, HEARTBEAT_MS);
    this.#heartbeat.unref();
    $log.info(`[radio] listening for radio connections on ${RADIO_WS_PATH}`);
  }

  // --- settings ---------------------------------------------------------------------------

  async #getSettings() {
    if (this.#settings && Date.now() - this.#settings.at < SETTINGS_CACHE_MS) return this.#settings;
    const [feature, settings] = await Promise.all([
      prisma.cadFeature.findFirst({ where: { feature: Feature.RADIO } }),
      prisma.radioSettings.findFirst(),
    ]);
    const wantsLiveKit = settings?.transport === RadioTransport.LIVEKIT;
    this.#settings = {
      enabled: feature?.isEnabled ?? false,
      transport: wantsLiveKit && getLiveKitConfig() ? "livekit" : "builtin",
      at: Date.now(),
    };
    return this.#settings;
  }

  /** current transport (for token responses) */
  async transport() {
    return (await this.#getSettings()).transport;
  }

  async isEnabled() {
    return (await this.#getSettings()).enabled;
  }

  /** call after the radio feature or settings changed */
  settingsChanged() {
    this.#settings = null;
  }

  // --- connections ------------------------------------------------------------------------

  #onConnection(socket: WebSocket) {
    const session: Session = {
      connectionId: randomBytes(6).toString("hex"),
      socket,
      claims: null,
      access: null,
      joined: new Map(),
      handles: new Map(),
      nextHandle: 1,
      earpiece: false,
      speaker: false,
      frameWindow: 0,
      frameCount: 0,
      alive: true,
      queue: Promise.resolve(),
    };
    this.#sessions.add(session);

    const helloTimer = setTimeout(() => {
      if (!session.access) this.#fatal(session, "auth", "No hello received.");
    }, HELLO_TIMEOUT_MS);

    socket.on("pong", () => {
      session.alive = true;
    });
    socket.on("message", (data: RawData, isBinary: boolean) => {
      session.alive = true;
      if (isBinary) {
        this.#onAudio(session, toUint8Array(data));
        return;
      }
      const message = parseClientMessage(data.toString());
      if (!message) return;
      session.queue = session.queue
        .then(() => this.#onMessage(session, message))
        .catch((error) => {
          $log.error("[radio] message failed", error);
          this.#send(session, { t: "error", code: "internal", message: "Something went wrong." });
        });
    });
    socket.on("close", () => {
      clearTimeout(helloTimer);
      this.#onClose(session);
    });
    socket.on("error", () => socket.terminate());
  }

  #send(session: Session, message: ServerMessage) {
    if (session.socket.readyState === session.socket.OPEN) {
      session.socket.send(JSON.stringify(message));
    }
  }

  #fatal(session: Session, code: string, message: string) {
    this.#send(session, { t: "error", code, message, fatal: true });
    session.socket.close(4001, code);
  }

  async #onMessage(session: Session, message: ClientMessage) {
    if (message.t === "hello") {
      await this.#hello(session, message.token);
      return;
    }
    if (!session.access) {
      this.#fatal(session, "auth", "Send hello first.");
      return;
    }

    switch (message.t) {
      case "join":
        await this.#join(
          session,
          String(message.channel),
          message.mode === "listen" ? "listen" : "member",
        );
        break;
      case "leave":
        this.#leave(session, String(message.channel));
        break;
      case "ptt":
        if (message.on) this.#pttOn(session, String(message.channel));
        else this.#pttOff(session, String(message.channel));
        break;
      case "state":
        this.#setState(session, message);
        break;
      case "ping":
        this.#send(session, { t: "pong", ts: message.ts });
        break;
    }
  }

  async #hello(session: Session, token: string) {
    if (session.access) return;
    const claims = typeof token === "string" ? verifyRadioToken(token) : null;
    if (!claims) {
      this.#fatal(session, "auth", "Invalid or expired radio token.");
      return;
    }
    const settings = await this.#getSettings();
    if (!settings.enabled) {
      this.#fatal(session, "disabled", "The radio is turned off in the CAD's features.");
      return;
    }
    const access = await resolveRadioAccess(claims);
    if (!access) {
      this.#fatal(session, "auth", "This radio user no longer exists.");
      return;
    }
    session.claims = claims;
    session.access = access;
    this.#send(session, {
      t: "ready",
      identity: access.identity,
      channels: access.visible,
      transport: settings.transport,
    });
  }

  #channel(id: string) {
    let state = this.#channels.get(id);
    if (!state) {
      state = { id, sessions: new Set(), talker: null, talkTimer: null };
      this.#channels.set(id, state);
    }
    return state;
  }

  async #join(session: Session, channelId: string, mode: ChannelMode) {
    const access = session.access!.channels.get(channelId);
    if (!access || (mode === "member" ? !access.member : !access.listen)) {
      this.#send(session, {
        t: "error",
        code: "forbidden",
        message: "You can't use this channel.",
      });
      return;
    }

    let joined = session.joined.get(channelId);
    if (!joined) {
      if (session.joined.size >= 32) {
        this.#send(session, { t: "error", code: "limit", message: "Too many channels." });
        return;
      }
      const handle = session.nextHandle;
      session.nextHandle = session.nextHandle >= MAX_HANDLE ? 1 : session.nextHandle + 1;
      joined = { handle, mode };
      session.joined.set(channelId, joined);
      session.handles.set(handle, channelId);
    } else {
      joined.mode = mode;
    }

    const state = this.#channel(channelId);
    state.sessions.add(session);

    const settings = await this.#getSettings();
    let livekit: { room: string; token: string; url: string } | null = null;
    const livekitConfig = settings.transport === "livekit" ? getLiveKitConfig() : null;
    if (livekitConfig) {
      const room = livekitRoomName(channelId);
      livekit = {
        room,
        url: livekitConfig.url,
        token: signLiveKitToken(livekitConfig, {
          identity: `${session.access!.identity.id}#${session.connectionId}`,
          name: session.access!.identity.name,
          room,
          canPublish: mode === "member" && access.transmit,
        }),
      };
    }

    this.#send(session, {
      t: "joined",
      channel: channelId,
      handle: joined.handle,
      mode,
      members: this.#members(state),
      livekit,
    });
    if (state.talker && state.talker !== session) {
      const talker = state.talker.access!.identity;
      this.#send(session, {
        t: "talk",
        channel: channelId,
        id: talker.id,
        name: talker.name,
        on: true,
      });
    }
    this.#broadcastMembers(state);
  }

  #leave(session: Session, channelId: string, notify = true) {
    const joined = session.joined.get(channelId);
    if (!joined) return;
    session.joined.delete(channelId);
    session.handles.delete(joined.handle);
    const state = this.#channels.get(channelId);
    if (state) {
      if (state.talker === session) this.#releaseTalker(state);
      state.sessions.delete(session);
      this.#broadcastMembers(state);
      if (!state.sessions.size) this.#channels.delete(channelId);
    }
    if (notify) this.#send(session, { t: "left", channel: channelId });
  }

  #pttOn(session: Session, channelId: string) {
    const joined = session.joined.get(channelId);
    const access = session.access!.channels.get(channelId);
    if (!joined || joined.mode !== "member" || !access?.transmit) {
      this.#send(session, {
        t: "error",
        code: "forbidden",
        message: "You can't transmit on this channel.",
      });
      return;
    }
    const state = this.#channel(channelId);
    const current = state.talker;
    if (current && current !== session) {
      if (session.access!.priority && !current.access!.priority) {
        this.#send(current, {
          t: "preempted",
          channel: channelId,
          by: session.access!.identity.name,
        });
        this.#releaseTalker(state);
      } else {
        this.#send(session, { t: "busy", channel: channelId, by: current.access!.identity.name });
        return;
      }
    }

    if (state.talker !== session) {
      state.talker = session;
      const { id, name } = session.access!.identity;
      this.#broadcast(state, { t: "talk", channel: channelId, id, name, on: true });
      this.#broadcastMembers(state);
    }
    if (state.talkTimer) clearTimeout(state.talkTimer);
    state.talkTimer = setTimeout(() => {
      if (state.talker !== session) return;
      this.#send(session, { t: "preempted", channel: channelId, by: "timeout" });
      this.#releaseTalker(state);
    }, MAX_TRANSMIT_MS);
    this.#send(session, { t: "granted", channel: channelId });
  }

  #pttOff(session: Session, channelId: string) {
    const state = this.#channels.get(channelId);
    if (state?.talker === session) this.#releaseTalker(state);
  }

  #releaseTalker(state: ChannelState) {
    const talker = state.talker;
    if (state.talkTimer) clearTimeout(state.talkTimer);
    state.talkTimer = null;
    state.talker = null;
    if (!talker?.access) return;
    const { id, name } = talker.access.identity;
    this.#broadcast(state, { t: "talk", channel: state.id, id, name, on: false });
    this.#broadcastMembers(state);
  }

  #setState(session: Session, message: { earpiece?: boolean; speaker?: boolean }) {
    if (typeof message.earpiece === "boolean") session.earpiece = message.earpiece;
    if (typeof message.speaker === "boolean") session.speaker = message.speaker;
    for (const channelId of session.joined.keys()) {
      const state = this.#channels.get(channelId);
      if (state) this.#broadcastMembers(state);
    }
  }

  #onAudio(session: Session, data: Uint8Array) {
    const frame = decodeAudioFrame(data);
    if (!frame || !session.access) return;
    const channelId = session.handles.get(frame.handle);
    if (!channelId) return;
    const state = this.#channels.get(channelId);
    if (!state || state.talker !== session) return;

    // rate limit per socket
    const second = Math.floor(Date.now() / 1000);
    if (session.frameWindow !== second) {
      session.frameWindow = second;
      session.frameCount = 0;
    }
    if (++session.frameCount > MAX_FRAMES_PER_SECOND) return;

    for (const receiver of state.sessions) {
      if (receiver === session) continue;
      const joined = receiver.joined.get(channelId);
      if (!joined || receiver.socket.readyState !== receiver.socket.OPEN) continue;
      // a receiver that can't keep up loses audio instead of building a backlog
      if (receiver.socket.bufferedAmount > 256 * 1024) continue;
      receiver.socket.send(withHandle(data, joined.handle), { binary: true });
    }
  }

  #onClose(session: Session) {
    this.#sessions.delete(session);
    for (const channelId of [...session.joined.keys()]) this.#leave(session, channelId, false);
  }

  // --- helpers -------------------------------------------------------------------------------

  #members(state: ChannelState): RadioMember[] {
    const members = new Map<string, RadioMember>();
    for (const session of state.sessions) {
      const joined = session.joined.get(state.id);
      if (!session.access || joined?.mode !== "member") continue;
      const { id, name, kind } = session.access.identity;
      const existing = members.get(id);
      members.set(id, {
        id,
        name,
        kind,
        mode: "member",
        talking: (existing?.talking ?? false) || state.talker === session,
        earpiece: session.earpiece,
      });
    }
    return [...members.values()];
  }

  #broadcast(state: ChannelState, message: ServerMessage) {
    const text = JSON.stringify(message);
    for (const session of state.sessions) {
      if (session.socket.readyState === session.socket.OPEN) session.socket.send(text);
    }
  }

  #broadcastMembers(state: ChannelState) {
    this.#broadcast(state, { t: "members", channel: state.id, members: this.#members(state) });
  }

  // --- used by the API ------------------------------------------------------------------------

  /** dispatch moved a unit: tell every radio of that CAD user to switch channel */
  switchUser(userId: string, channelId: string) {
    let count = 0;
    for (const session of this.#sessions) {
      if (session.access?.identity.userId !== userId) continue;
      if (!session.access.channels.get(channelId)?.member) continue;
      this.#send(session, { t: "switch", channel: channelId });
      count++;
    }
    return count;
  }

  /** plays a tone for everyone on (or listening to) a channel */
  sendTone(channelId: string, tone: string) {
    const state = this.#channels.get(channelId);
    if (state) this.#broadcast(state, { t: "tone", channel: channelId, tone });
  }

  /** re-checks every session's access, e.g. after channels or permissions changed */
  async refreshAccess() {
    this.settingsChanged();
    const enabled = await this.isEnabled();
    await Promise.all(
      [...this.#sessions].map(async (session) => {
        if (!session.claims) return;
        if (!enabled) {
          this.#fatal(session, "disabled", "The radio was turned off.");
          return;
        }
        const access = await resolveRadioAccess(session.claims);
        if (!access) {
          this.#fatal(session, "auth", "This radio user no longer exists.");
          return;
        }
        session.access = access;
        for (const [channelId, joined] of [...session.joined]) {
          const channel = access.channels.get(channelId);
          if (!channel || (joined.mode === "member" ? !channel.member : !channel.listen)) {
            this.#leave(session, channelId);
          }
        }
        this.#send(session, { t: "channels", channels: access.visible });
      }),
    );
  }

  /** who is on which channel right now (dispatch overview) */
  status(): RadioChannelStatus[] {
    return [...this.#channels.values()].map((state) => ({
      id: state.id,
      members: this.#members(state),
      listeners: [...state.sessions].filter((s) => s.joined.get(state.id)?.mode === "listen")
        .length,
      talking: state.talker?.access
        ? { id: state.talker.access.identity.id, name: state.talker.access.identity.name }
        : null,
    }));
  }

  close() {
    if (this.#heartbeat) clearInterval(this.#heartbeat);
    for (const session of this.#sessions) session.socket.terminate();
    this.#wss.close();
  }
}

function toUint8Array(data: RawData): Uint8Array {
  if (Array.isArray(data)) return new Uint8Array(Buffer.concat(data));
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

export const radioServer = new RadioServer();
