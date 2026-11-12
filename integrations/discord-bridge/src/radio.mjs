import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { RADIO_FRAME, mulawDecode, mulawEncode } from "./audio.mjs";

/**
 * One connection to the SnailyCAD radio for one person (or the bridge itself), on one channel.
 * Protocol: docs/radio/protocol.md. Only the built-in audio transport is supported.
 *
 * Events: "ready" (identity), "joined", "talk" ({ id, name, on }), "audio" (Int16Array, 320
 * samples), "granted", "busy" (by), "preempted" (by), "left", "error" (Error), "fatal" (Error)
 */
export class RadioSession extends EventEmitter {
  /** the server's id for this connection, from "ready" (talk messages use it) */
  identityId = null;
  joined = false;
  granted = false;
  closed = false;
  #options;
  #ws = null;
  #handle = null;
  #channelId = null;
  #seq = 0;
  #pttWanted = false;
  #pingTimer = null;
  #retryTimer = null;
  #retry = 0;

  /**
   * @param {{ api: string, apiToken: string, channel: string, name: string, identity: string,
   *   identifiers?: Record<string, string>, clientName?: string, fetch?: typeof fetch }} options
   */
  constructor(options) {
    super();
    this.#options = options;
  }

  get channelId() {
    return this.#channelId;
  }

  async connect() {
    this.closed = false;
    let radio;
    try {
      radio = await this.#getToken();
    } catch (error) {
      this.emit("error", error);
      this.#scheduleReconnect();
      return;
    }

    if (radio.transport !== "builtin") {
      this.closed = true;
      this.emit(
        "fatal",
        new Error(
          `The CAD radio uses the "${radio.transport}" audio server. The Discord bridge only works with the built-in one (Admin > CAD Settings > Radio > Audio server).`,
        ),
      );
      return;
    }

    const wanted = String(this.#options.channel).toLowerCase();
    const channel = radio.channels.find(
      (c) =>
        c.id === this.#options.channel ||
        c.name.toLowerCase() === wanted ||
        (c.frequency && String(c.frequency).toLowerCase() === wanted),
    );
    if (!channel) {
      this.closed = true;
      this.emit(
        "fatal",
        new Error(
          `"${this.#options.name}" can't use radio channel "${this.#options.channel}". Channels it can use: ${
            radio.channels.map((c) => c.name).join(", ") || "none"
          }`,
        ),
      );
      return;
    }
    this.#channelId = channel.id;

    const ws = new WebSocket(radio.wsUrl);
    this.#ws = ws;
    ws.on("open", () => {
      this.#retry = 0;
      this.#send({
        t: "hello",
        token: radio.token,
        client: this.#options.clientName ?? "snailycad-discord-bridge/1.0",
      });
      this.#pingTimer = setInterval(() => this.#send({ t: "ping", ts: Date.now() }), 20_000);
    });
    ws.on("message", (data, isBinary) => this.#onMessage(data, isBinary));
    ws.on("error", (error) => this.emit("error", error));
    ws.on("close", () => {
      if (this.#ws !== ws) return;
      this.#reset();
      this.#scheduleReconnect();
    });
  }

  async #getToken() {
    const doFetch = this.#options.fetch ?? fetch;
    const response = await doFetch(
      `${this.#options.api.replace(/\/+$/, "")}/radio/external/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "snaily-cad-api-token": this.#options.apiToken,
        },
        body: JSON.stringify({
          name: this.#options.name,
          identity: this.#options.identity,
          identifiers: this.#options.identifiers,
          kind: "external",
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`radio token: HTTP ${response.status} ${await response.text()}`);
    }
    return response.json();
  }

  #onMessage(data, isBinary) {
    if (isBinary) {
      const frame = Buffer.from(data);
      if (frame.length < 6 || frame[0] !== 1 || frame[1] !== 1) return;
      if (frame.readUInt16BE(2) !== this.#handle) return;
      this.emit("audio", mulawDecode(frame.subarray(6)));
      return;
    }

    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (message.channel && this.#channelId && message.channel !== this.#channelId) return;

    switch (message.t) {
      case "ready":
        this.identityId = message.identity?.id ?? null;
        this.emit("ready", message.identity);
        this.#send({ t: "join", channel: this.#channelId, mode: "member" });
        break;
      case "joined":
        this.#handle = message.handle;
        this.joined = true;
        this.emit("joined", message);
        if (this.#pttWanted) this.#send({ t: "ptt", channel: this.#channelId, on: true });
        break;
      case "left":
        this.joined = false;
        this.granted = false;
        this.emit("left", message);
        break;
      case "talk":
        this.emit("talk", { id: message.id, name: message.name, on: message.on });
        break;
      case "granted":
        if (!this.#pttWanted) {
          // released while waiting: give the channel back
          this.#send({ t: "ptt", channel: this.#channelId, on: false });
          break;
        }
        this.granted = true;
        this.#seq = 0;
        this.emit("granted");
        break;
      case "busy":
        this.#pttWanted = false;
        this.emit("busy", message.by);
        break;
      case "preempted":
        this.#pttWanted = false;
        this.granted = false;
        this.emit("preempted", message.by);
        break;
      case "error":
        this.emit("error", new Error(`${message.code}: ${message.message}`));
        if (message.fatal) this.closed = true;
        break;
      default:
        break;
    }
  }

  /** push-to-talk on / off */
  talk(on) {
    if (on === this.#pttWanted) return;
    this.#pttWanted = on;
    if (!on) this.granted = false;
    if (this.joined) this.#send({ t: "ptt", channel: this.#channelId, on });
  }

  get talking() {
    return this.#pttWanted;
  }

  /** sends one 20 ms frame (320 samples at 16 kHz); dropped unless granted */
  sendFrame(samples) {
    const ws = this.#ws;
    if (!this.granted || !ws || ws.readyState !== WebSocket.OPEN) return false;
    if (samples.length !== RADIO_FRAME) throw new Error(`frames are ${RADIO_FRAME} samples`);
    // drop rather than queue when the connection can't keep up
    if (ws.bufferedAmount > 64 * 1024) return false;
    const frame = Buffer.alloc(6 + RADIO_FRAME);
    frame[0] = 1;
    frame[1] = 1;
    frame.writeUInt16BE(this.#handle, 2);
    frame.writeUInt16BE(this.#seq++ & 0xffff, 4);
    mulawEncode(samples).copy(frame, 6);
    ws.send(frame);
    return true;
  }

  #send(message) {
    if (this.#ws?.readyState === WebSocket.OPEN) this.#ws.send(JSON.stringify(message));
  }

  #reset() {
    clearInterval(this.#pingTimer);
    this.#pingTimer = null;
    this.joined = false;
    this.granted = false;
    this.#handle = null;
  }

  #scheduleReconnect() {
    if (this.closed) return;
    const delay = Math.min(30_000, 1000 * 2 ** this.#retry++);
    this.#retryTimer = setTimeout(() => void this.connect(), delay);
  }

  close() {
    this.closed = true;
    clearTimeout(this.#retryTimer);
    this.#reset();
    const ws = this.#ws;
    this.#ws = null;
    ws?.close();
  }
}
