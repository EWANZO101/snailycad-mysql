import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { type ClientMessage, type ServerMessage, decodeAudioFrame } from "../src";

// a microphone the test can feed frames into
const microphones: FakeMicrophone[] = [];
class FakeMicrophone {
  transmitting = false;
  constructor(
    _context: unknown,
    public options: { onFrame(frame: Float32Array): void },
  ) {
    microphones.push(this);
  }
  open() {
    return Promise.resolve();
  }
  close() {
    this.transmitting = false;
  }
}
vi.mock("../src/browser/capture", () => ({ Microphone: FakeMicrophone }));
vi.mock("../src/browser/tones", () => ({
  isRadioTone: () => true,
  playTone: (_context: unknown, _master: unknown, name: string) => {
    tones.push(name);
    return Promise.resolve();
  },
}));
const tones: string[] = [];

/** every Web Audio node and param the player touches, as a do-nothing proxy */
function fakeAudioContext() {
  const node: unknown = new Proxy(() => node, {
    get: (_target, key) => (key === "then" ? undefined : node),
    apply: () => node,
  });
  return new Proxy(
    { state: "running", currentTime: 0, resume: () => Promise.resolve() },
    { get: (target, key) => (key in target ? target[key as keyof typeof target] : node) },
  ) as unknown as AudioContext;
}

class FakeSocket {
  static OPEN = 1;
  static last: FakeSocket;
  readyState = 1;
  bufferedAmount = 0;
  binaryType = "blob";
  sent: (ClientMessage | Uint8Array)[] = [];
  onopen?: () => void;
  onmessage?: (event: { data: unknown }) => void;
  onclose?: () => void;
  constructor() {
    FakeSocket.last = this;
    queueMicrotask(() => this.onopen?.());
  }
  send(data: string | Uint8Array) {
    this.sent.push(typeof data === "string" ? (JSON.parse(data) as ClientMessage) : data);
  }
  close() {
    this.readyState = 3;
  }
  receive(message: ServerMessage) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  messages() {
    return this.sent.filter((m): m is ClientMessage => !(m instanceof Uint8Array));
  }
  frames() {
    return this.sent.filter((m): m is Uint8Array => m instanceof Uint8Array);
  }
}

const channels = ["main", "fire", "ems"].map((id) => ({ id, name: id, canTransmit: true }));

async function connectedClient() {
  const { RadioClient } = await import("../src/browser/client");
  const client = new RadioClient({
    audioContext: fakeAudioContext(),
    getToken: async () => ({
      token: "t",
      wsUrl: "ws://test",
      transport: "builtin",
      livekitUrl: null,
      identity: { id: "d1", name: "Dispatch", kind: "dispatcher" },
      channels,
      audio: { codec: "mulaw", sampleRate: 16_000, frameMs: 20 },
    }),
  });
  await client.connect();
  const socket = FakeSocket.last;
  socket.receive({
    t: "ready",
    identity: { id: "d1", name: "Dispatch", kind: "dispatcher" },
    channels,
    transport: "builtin",
  });
  return { client, socket };
}

function joinedAs(socket: FakeSocket, channel: string, handle: number) {
  socket.receive({ t: "joined", channel, handle, mode: "member", members: [], livekit: null });
}

beforeEach(() => {
  vi.stubGlobal("WebSocket", FakeSocket);
  microphones.length = 0;
  tones.length = 0;
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("simulcast", () => {
  test("push-to-talk goes out on the transmit channel and every simulcast channel", async () => {
    const { client, socket } = await connectedClient();
    client.setTransmitChannel("main");
    client.setSimulcastChannels(["fire", "ems"]);
    expect(client.transmitTargets).toEqual(["main", "fire", "ems"]);
    expect(socket.messages()).toContainEqual({ t: "join", channel: "fire", mode: "member" });
    joinedAs(socket, "main", 1);
    joinedAs(socket, "fire", 2);
    joinedAs(socket, "ems", 3);

    await client.startTransmit();
    const pttOn = socket.messages().filter((m) => m.t === "ptt" && m.on);
    expect(pttOn.map((m) => (m as { channel: string }).channel)).toEqual(["main", "fire", "ems"]);

    socket.receive({ t: "granted", channel: "main" });
    socket.receive({ t: "granted", channel: "fire" });
    socket.receive({ t: "busy", channel: "ems", by: "Unit 12" });
    expect([...client.transmittingOn]).toEqual(["main", "fire"]);
    expect(tones.filter((tone) => tone === "permit")).toHaveLength(1);

    microphones[0]!.options.onFrame(new Float32Array(320));
    const handles = socket.frames().map((frame) => decodeAudioFrame(frame)!.handle);
    expect(handles).toEqual([1, 2]);

    client.stopTransmit();
    const pttOff = socket.messages().filter((m) => m.t === "ptt" && !m.on);
    expect(pttOff.map((m) => (m as { channel: string }).channel)).toEqual(["main", "fire"]);
    expect(client.transmittingOn.size).toBe(0);
    expect(client.transmitting).toBeNull();
    expect(tones.filter((tone) => tone === "roger")).toHaveLength(1);
  });

  test("a channel taken out of the simulcast stays on as a listener", async () => {
    const { client, socket } = await connectedClient();
    client.setTransmitChannel("main");
    client.setSimulcastChannels(["fire"]);
    client.setSimulcastChannels([]);
    expect(client.transmitTargets).toEqual(["main"]);
    expect(socket.messages().at(-1)).toEqual({ t: "join", channel: "fire", mode: "listen" });
  });

  test("preempted on one channel keeps the others transmitting", async () => {
    const { client, socket } = await connectedClient();
    client.setTransmitChannel("main");
    client.setSimulcastChannels(["fire"]);
    joinedAs(socket, "main", 1);
    joinedAs(socket, "fire", 2);
    await client.startTransmit();
    socket.receive({ t: "granted", channel: "main" });
    socket.receive({ t: "granted", channel: "fire" });
    socket.receive({ t: "preempted", channel: "main", by: "Supervisor" });
    expect([...client.transmittingOn]).toEqual(["fire"]);
    expect(client.transmitting).toBe("fire");
    expect(microphones[0]!.transmitting).toBe(true);
  });

  test("startTransmit(channel) still talks on that one channel only", async () => {
    const { client, socket } = await connectedClient();
    client.setTransmitChannel("main");
    client.setSimulcastChannels(["fire"]);
    await client.startTransmit("main");
    const pttOn = socket.messages().filter((m) => m.t === "ptt" && m.on);
    expect(pttOn).toEqual([{ t: "ptt", channel: "main", on: true }]);
  });
});
