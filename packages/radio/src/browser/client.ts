import {
  type ChannelMode,
  type ClientMessage,
  type RadioChannelInfo,
  type RadioIdentity,
  type RadioMember,
  type RadioTokenResponse,
  type RadioTransport,
  type ServerMessage,
  decodeAudioFrame,
  encodeAudioFrame,
} from "../protocol";
import { mulawDecode, mulawEncode } from "../mulaw";
import { Emitter } from "./emitter";
import { Microphone } from "./capture";
import { RadioOutput } from "./player";
import { type RadioToneName, isRadioTone, playTone } from "./tones";
import { LiveKitAudio } from "./livekit";

export type RadioStatus = "idle" | "connecting" | "connected" | "reconnecting" | "closed";

export interface JoinedChannel {
  id: string;
  mode: ChannelMode;
  handle: number;
  members: RadioMember[];
  /** identity id -> name of who is transmitting right now */
  talking: Map<string, string>;
}

export interface RadioClientEvents {
  [key: string]: unknown;
  status: RadioStatus;
  ready: { identity: RadioIdentity; channels: RadioChannelInfo[]; transport: RadioTransport };
  channels: RadioChannelInfo[];
  joined: JoinedChannel;
  left: { channel: string };
  members: { channel: string; members: RadioMember[] };
  talk: { channel: string; id: string; name: string; on: boolean };
  /** our own transmission: on = audio is going out */
  transmit: { channel: string; on: boolean };
  busy: { channel: string; by: string };
  preempted: { channel: string; by: string };
  /** dispatch moved us to this channel (the client has already switched) */
  switch: { channel: string; from: string | null };
  tone: { channel: string; tone: string };
  level: number;
  error: { code: string; message: string };
}

export interface RadioClientOptions {
  /** fetches a fresh radio token (POST /v1/radio/token or your own backend) */
  getToken: () => Promise<RadioTokenResponse>;
  /** shown in logs, e.g. "cad-browser/1.0" or "fivem/1.0" */
  clientName?: string;
  /** radio sound (band-pass + saturation) on received audio */
  radioEffect?: boolean;
  /** local beeps for talk permit / end / busy */
  tones?: boolean;
  /** follow "switch" messages from dispatch automatically */
  followSwitch?: boolean;
  microphoneDeviceId?: string;
  /** reuse an AudioContext (e.g. the FiveM NUI's) */
  audioContext?: AudioContext;
}

const PING_MS = 20_000;

export class RadioClient extends Emitter<RadioClientEvents> {
  status: RadioStatus = "idle";
  identity: RadioIdentity | null = null;
  channels: RadioChannelInfo[] = [];
  transport: RadioTransport = "builtin";
  readonly joined = new Map<string, JoinedChannel>();
  /** the channel PTT transmits on */
  transmitChannel: string | null = null;
  /** channel currently transmitting on (after "granted") */
  transmitting: string | null = null;
  earpiece = false;

  readonly output: RadioOutput;
  readonly microphone: Microphone;
  #options: RadioClientOptions;
  #socket: WebSocket | null = null;
  #token: RadioTokenResponse | null = null;
  /** channels we want to be in, re-joined after reconnects */
  #wanted = new Map<string, ChannelMode>();
  #handles = new Map<number, string>();
  #volumes = new Map<string, number>();
  #pttWanted: string | null = null;
  #seq = 0;
  #retry = 0;
  #retryTimer: ReturnType<typeof setTimeout> | null = null;
  #pingTimer: ReturnType<typeof setInterval> | null = null;
  #livekit: LiveKitAudio | null = null;
  #closed = false;

  constructor(options: RadioClientOptions) {
    super();
    this.#options = { radioEffect: true, tones: true, followSwitch: true, ...options };
    const context = options.audioContext ?? new AudioContext({ latencyHint: "interactive" });
    this.output = new RadioOutput(context, { effect: this.#options.radioEffect });
    this.microphone = new Microphone(context, {
      deviceId: options.microphoneDeviceId,
      onFrame: (frame) => this.#sendAudio(frame),
      onLevel: (level) => this.emit("level", level),
    });
  }

  // --- connection ---------------------------------------------------------------------

  async connect() {
    this.#closed = false;
    this.#setStatus(
      this.status === "idle" || this.status === "closed" ? "connecting" : "reconnecting",
    );
    try {
      this.#token = await this.#options.getToken();
    } catch (error) {
      this.emit("error", { code: "token", message: errorMessage(error) });
      this.#scheduleReconnect();
      return;
    }
    this.transport = this.#token.transport;
    this.channels = this.#token.channels;
    this.identity = this.#token.identity;

    const socket = new WebSocket(this.#token.wsUrl);
    socket.binaryType = "arraybuffer";
    this.#socket = socket;

    socket.onopen = () => {
      this.#send({
        t: "hello",
        token: this.#token!.token,
        client: this.#options.clientName ?? "browser",
      });
    };
    socket.onmessage = (event) => {
      if (typeof event.data === "string") this.#onMessage(event.data);
      else this.#onAudio(new Uint8Array(event.data as ArrayBuffer));
    };
    socket.onclose = () => {
      if (this.#socket !== socket) return;
      this.#socket = null;
      this.#stopPing();
      this.#resetSession();
      if (this.#closed) {
        this.#setStatus("closed");
      } else {
        this.#scheduleReconnect();
      }
    };
  }

  disconnect() {
    this.#closed = true;
    if (this.#retryTimer) clearTimeout(this.#retryTimer);
    this.#stopPing();
    this.#socket?.close();
    this.#socket = null;
    this.#resetSession();
    this.microphone.close();
    void this.#livekit?.close();
    this.#livekit = null;
    this.#setStatus("closed");
  }

  #scheduleReconnect() {
    if (this.#closed) return;
    this.#setStatus("reconnecting");
    const delay = Math.min(15_000, 1000 * 2 ** this.#retry++);
    this.#retryTimer = setTimeout(() => void this.connect(), delay);
  }

  #resetSession() {
    this.#stopTransmitting(false);
    for (const id of this.joined.keys()) {
      this.output.remove(id);
      void this.#livekit?.leave(id);
    }
    this.joined.clear();
    this.#handles.clear();
  }

  #setStatus(status: RadioStatus) {
    if (this.status === status) return;
    this.status = status;
    this.emit("status", status);
  }

  #stopPing() {
    if (this.#pingTimer) clearInterval(this.#pingTimer);
    this.#pingTimer = null;
  }

  #send(message: ClientMessage) {
    if (this.#socket?.readyState === WebSocket.OPEN) this.#socket.send(JSON.stringify(message));
  }

  // --- channels ---------------------------------------------------------------------------

  /** join a channel; `member` can transmit, `listen` only receives */
  join(channel: string, mode: ChannelMode = "member") {
    this.#wanted.set(channel, mode);
    if (mode === "member" && !this.transmitChannel) this.transmitChannel = channel;
    this.#send({ t: "join", channel, mode });
  }

  leave(channel: string) {
    this.#wanted.delete(channel);
    if (this.transmitting === channel) this.stopTransmit();
    if (this.transmitChannel === channel) {
      this.transmitChannel = [...this.#wanted].find(([, mode]) => mode === "member")?.[0] ?? null;
    }
    this.#send({ t: "leave", channel });
  }

  setTransmitChannel(channel: string) {
    if (this.#wanted.get(channel) !== "member") this.join(channel, "member");
    this.transmitChannel = channel;
  }

  /** 0..1 */
  setChannelVolume(channel: string, volume: number) {
    this.#volumes.set(channel, volume);
    this.output.channel(channel).setVolume(volume);
    this.#livekit?.setVolume(channel, volume);
  }

  setChannelPan(channel: string, pan: number) {
    this.output.channel(channel).setPan(pan);
  }

  setVolume(volume: number) {
    this.output.setVolume(volume);
  }

  setRadioState(state: { earpiece?: boolean; speaker?: boolean }) {
    if (typeof state.earpiece === "boolean") this.earpiece = state.earpiece;
    this.#send({ t: "state", ...state });
  }

  // --- push to talk -------------------------------------------------------------------------

  /** starts transmitting on `channel` (default: the transmit channel) */
  async startTransmit(channel = this.transmitChannel) {
    if (!channel || this.#pttWanted) return;
    void this.output.resume();
    this.#pttWanted = channel;
    try {
      if (this.transport === "builtin") await this.microphone.open();
    } catch (error) {
      this.#pttWanted = null;
      this.emit("error", { code: "microphone", message: errorMessage(error) });
      this.#tone("error");
      return;
    }
    if (this.#pttWanted !== channel) return; // released while the microphone was opening
    this.#send({ t: "ptt", channel, on: true });
  }

  stopTransmit() {
    const channel = this.#pttWanted;
    this.#pttWanted = null;
    if (!channel) return;
    this.#send({ t: "ptt", channel, on: false });
    this.#stopTransmitting(true);
  }

  #stopTransmitting(roger: boolean) {
    const channel = this.transmitting;
    if (!channel) return;
    this.transmitting = null;
    this.microphone.transmitting = false;
    void this.#livekit?.setTransmitting(channel, false);
    if (roger) this.#tone("roger");
    this.emit("transmit", { channel, on: false });
  }

  #sendAudio(frame: Float32Array) {
    const channel = this.transmitting;
    const joined = channel ? this.joined.get(channel) : null;
    const socket = this.#socket;
    if (!joined || !socket || socket.readyState !== WebSocket.OPEN) return;
    // drop audio rather than queue it when the connection can't keep up
    if (socket.bufferedAmount > 64 * 1024) return;
    this.#seq = (this.#seq + 1) & 0xffff;
    socket.send(encodeAudioFrame(joined.handle, this.#seq, mulawEncode(frame)));
  }

  // --- incoming -------------------------------------------------------------------------------

  #onAudio(data: Uint8Array) {
    const frame = decodeAudioFrame(data);
    if (!frame) return;
    const channel = this.#handles.get(frame.handle);
    if (!channel) return;
    this.output.channel(channel).play(mulawDecode(frame.payload));
  }

  #onMessage(text: string) {
    let message: ServerMessage;
    try {
      message = JSON.parse(text) as ServerMessage;
    } catch {
      return;
    }

    switch (message.t) {
      case "ready": {
        this.#retry = 0;
        this.identity = message.identity;
        this.channels = message.channels;
        this.transport = message.transport;
        this.#setStatus("connected");
        this.#stopPing();
        this.#pingTimer = setInterval(() => this.#send({ t: "ping", ts: Date.now() }), PING_MS);
        this.emit("ready", {
          identity: message.identity,
          channels: message.channels,
          transport: message.transport,
        });
        for (const [channel, mode] of this.#wanted) this.#send({ t: "join", channel, mode });
        if (this.earpiece) this.#send({ t: "state", earpiece: true });
        break;
      }
      case "channels":
        this.channels = message.channels;
        this.emit("channels", message.channels);
        break;
      case "joined": {
        const joined: JoinedChannel = {
          id: message.channel,
          mode: message.mode,
          handle: message.handle,
          members: message.members,
          talking: new Map(message.members.filter((m) => m.talking).map((m) => [m.id, m.name])),
        };
        this.joined.set(message.channel, joined);
        this.#handles.set(message.handle, message.channel);
        const volume = this.#volumes.get(message.channel) ?? 1;
        this.output.channel(message.channel).setVolume(volume);
        if (message.livekit) {
          this.#livekit ??= new LiveKitAudio();
          void this.#livekit
            .join(message.channel, message.livekit.url, message.livekit.token)
            .then(() => this.#livekit?.setVolume(message.channel, volume))
            .catch((error) =>
              this.emit("error", { code: "livekit", message: errorMessage(error) }),
            );
        }
        this.emit("joined", joined);
        break;
      }
      case "left": {
        const joined = this.joined.get(message.channel);
        if (joined) this.#handles.delete(joined.handle);
        this.joined.delete(message.channel);
        this.output.remove(message.channel);
        void this.#livekit?.leave(message.channel);
        if (this.transmitting === message.channel) this.#stopTransmitting(false);
        this.emit("left", { channel: message.channel });
        break;
      }
      case "members": {
        const joined = this.joined.get(message.channel);
        if (joined) joined.members = message.members;
        this.emit("members", { channel: message.channel, members: message.members });
        break;
      }
      case "talk": {
        const joined = this.joined.get(message.channel);
        if (joined) {
          if (message.on) joined.talking.set(message.id, message.name);
          else joined.talking.delete(message.id);
        }
        this.emit("talk", message);
        break;
      }
      case "granted": {
        if (this.#pttWanted !== message.channel) {
          this.#send({ t: "ptt", channel: message.channel, on: false });
          break;
        }
        this.transmitting = message.channel;
        this.#seq = 0;
        this.#tone("permit");
        if (this.transport === "livekit") {
          void this.#livekit?.setTransmitting(message.channel, true);
        } else {
          // the permit chirp is short; start sending right away
          this.microphone.transmitting = true;
        }
        this.emit("transmit", { channel: message.channel, on: true });
        break;
      }
      case "busy":
        if (this.#pttWanted === message.channel) this.#pttWanted = null;
        this.#tone("busy");
        this.emit("busy", message);
        break;
      case "preempted":
        if (this.#pttWanted === message.channel) this.#pttWanted = null;
        this.#stopTransmitting(false);
        this.#tone("busy");
        this.emit("preempted", message);
        break;
      case "switch": {
        const from = this.transmitChannel;
        if (this.#options.followSwitch && from !== message.channel) {
          if (from && this.#wanted.get(from) === "member") this.leave(from);
          this.join(message.channel, "member");
          this.transmitChannel = message.channel;
          this.#tone("beep");
        }
        this.emit("switch", { channel: message.channel, from });
        break;
      }
      case "tone":
        if (isRadioTone(message.tone)) this.#tone(message.tone, true);
        this.emit("tone", message);
        break;
      case "error":
        this.emit("error", { code: message.code, message: message.message });
        if (message.fatal) this.#closed = message.code === "auth";
        break;
      case "pong":
        break;
    }
  }

  #tone(name: RadioToneName, force = false) {
    if (!this.#options.tones && !force) return;
    void this.output.resume();
    void playTone(this.output.context, this.output.master, name);
  }

  /** plays one of the built-in tones locally */
  playTone(name: RadioToneName) {
    this.#tone(name, true);
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
