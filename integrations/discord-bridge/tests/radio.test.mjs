import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { WebSocketServer } from "ws";
import { RADIO_FRAME, mulawEncode } from "../src/audio.mjs";
import { RadioSession } from "../src/radio.mjs";

/** a tiny stand-in for the CAD radio server (docs/radio/protocol.md) */
async function mockServer({ transport = "builtin", busy = false } = {}) {
  const wss = new WebSocketServer({ port: 0 });
  await once(wss, "listening");
  const url = `ws://127.0.0.1:${wss.address().port}`;
  const received = { messages: [], frames: [], tokenBodies: [] };
  let socket;
  wss.on("connection", (ws) => {
    socket = ws;
    ws.on("message", (data, isBinary) => {
      if (isBinary) return received.frames.push(Buffer.from(data));
      const message = JSON.parse(data.toString());
      received.messages.push(message);
      if (message.t === "hello")
        ws.send(
          JSON.stringify({ t: "ready", identity: { id: "x:discord:42", name: "Sam" }, transport }),
        );
      if (message.t === "join")
        ws.send(
          JSON.stringify({
            t: "joined",
            channel: message.channel,
            handle: 7,
            mode: "member",
            members: [],
          }),
        );
      if (message.t === "ptt" && message.on) {
        ws.send(
          JSON.stringify(
            busy
              ? { t: "busy", channel: message.channel, by: "Dispatch" }
              : { t: "granted", channel: message.channel },
          ),
        );
      }
    });
  });
  const fetch = async (_url, init) => {
    received.tokenBodies.push(JSON.parse(init.body));
    return new Response(
      JSON.stringify({
        token: "jwt",
        wsUrl: url,
        transport,
        channels: [
          { id: "c1", name: "Dispatch 1", frequency: "154.430", canTransmit: true },
          { id: "c2", name: "Fire", frequency: null, canTransmit: true },
        ],
      }),
      { status: 200 },
    );
  };
  return { wss, fetch, received, send: (message) => socket.send(message) };
}

function session(server, channel = "dispatch 1") {
  return new RadioSession({
    api: "https://cad.example.com/v1/",
    apiToken: "cad",
    channel,
    name: "Sam",
    identity: "discord:42",
    identifiers: { discordId: "42" },
    fetch: server.fetch,
  });
}

test("joins the channel by name, transmits after granted, and decodes audio", async () => {
  const server = await mockServer();
  const radio = session(server);
  const ready = once(radio, "joined");
  await radio.connect();
  await ready;

  assert.equal(radio.identityId, "x:discord:42");
  assert.deepEqual(server.received.tokenBodies[0], {
    name: "Sam",
    identity: "discord:42",
    identifiers: { discordId: "42" },
    kind: "external",
  });
  assert.deepEqual(
    server.received.messages.map((m) => m.t),
    ["hello", "join"],
  );
  assert.equal(server.received.messages[1].channel, "c1");

  assert.equal(radio.sendFrame(new Int16Array(RADIO_FRAME)), false, "no audio before granted");
  const granted = once(radio, "granted");
  radio.talk(true);
  await granted;
  assert.equal(radio.sendFrame(new Int16Array(RADIO_FRAME).fill(1000)), true);
  radio.talk(false);
  await new Promise((r) => setTimeout(r, 50));

  const [frame] = server.received.frames;
  assert.equal(frame.length, 6 + RADIO_FRAME);
  assert.equal(frame[0], 1);
  assert.equal(frame[1], 1);
  assert.equal(frame.readUInt16BE(2), 7, "the joined handle");
  assert.deepEqual(server.received.messages.slice(-2), [
    { t: "ptt", channel: "c1", on: true },
    { t: "ptt", channel: "c1", on: false },
  ]);

  // incoming audio for our handle is decoded; other handles and channels are ignored
  const audio = once(radio, "audio");
  const other = Buffer.alloc(6 + RADIO_FRAME);
  other[0] = 1;
  other[1] = 1;
  other.writeUInt16BE(9, 2);
  server.send(other);
  const mine = Buffer.concat([
    Buffer.from([1, 1, 0, 7, 0, 0]),
    mulawEncode(new Int16Array(RADIO_FRAME).fill(-2000)),
  ]);
  server.send(mine);
  const [samples] = await audio;
  assert.equal(samples.length, RADIO_FRAME);
  assert.ok(Math.abs(samples[0] + 2000) < 100);

  const talk = once(radio, "talk");
  server.send(
    JSON.stringify({ t: "talk", channel: "c2", id: "a", name: "Other channel", on: true }),
  );
  server.send(JSON.stringify({ t: "talk", channel: "c1", id: "b", name: "Dispatch", on: true }));
  assert.deepEqual((await talk)[0], { id: "b", name: "Dispatch", on: true });

  radio.close();
  server.wss.close();
});

test("busy releases push-to-talk", async () => {
  const server = await mockServer({ busy: true });
  const radio = session(server);
  const joined = once(radio, "joined");
  await radio.connect();
  await joined;
  const busy = once(radio, "busy");
  radio.talk(true);
  assert.deepEqual(await busy, ["Dispatch"]);
  assert.equal(radio.talking, false);
  assert.equal(radio.granted, false);
  radio.close();
  server.wss.close();
});

test("talk before the connection is ready is sent once joined", async () => {
  const server = await mockServer();
  const radio = session(server, "154.430");
  radio.talk(true);
  const granted = once(radio, "granted");
  await radio.connect();
  await granted;
  assert.equal(radio.channelId, "c1", "found by frequency");
  radio.close();
  server.wss.close();
});

test("unknown channel and LiveKit are fatal, with a clear message", async () => {
  const server = await mockServer();
  const missing = session(server, "Nope");
  const fatal = once(missing, "fatal");
  await missing.connect();
  assert.match((await fatal)[0].message, /can't use radio channel "Nope".*Dispatch 1, Fire/);
  server.wss.close();

  const livekit = await mockServer({ transport: "livekit" });
  const radio = session(livekit);
  const fatal2 = once(radio, "fatal");
  await radio.connect();
  assert.match((await fatal2)[0].message, /built-in one/);
  livekit.wss.close();
});
