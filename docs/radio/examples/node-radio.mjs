#!/usr/bin/env node
/**
 * A minimal SnailyCAD radio integration in plain Node.js (needs only the `ws` package).
 * It joins a channel, prints who talks, and can transmit a WAV file (or a test tone).
 *
 *   npm install ws
 *   CAD_API=https://cad-api.example.com/v1 CAD_API_TOKEN=... node node-radio.mjs "Dispatch 1" [file.wav]
 *
 * Protocol: docs/radio/protocol.md
 */
/* eslint-disable unicorn/number-literal-case -- G.711 bit masks */
import { readFileSync } from "node:fs";
import WebSocket from "ws";

const API = process.env.CAD_API;
const TOKEN = process.env.CAD_API_TOKEN;
const [channelName = "Dispatch 1", wavFile] = process.argv.slice(2);
if (!API || !TOKEN) {
  console.error("Set CAD_API and CAD_API_TOKEN.");
  process.exit(1);
}

// --- G.711 mu-law (16-bit PCM -> 8-bit) --------------------------------------------------------
function mulaw(sample) {
  const BIAS = 0x84;
  let s = Math.max(-32768, Math.min(32767, sample));
  const sign = s < 0 ? 0x80 : 0;
  if (sign) s = -s;
  s = Math.min(s, 32635) + BIAS;
  let exponent = 7;
  for (let mask = 0x4000; (s & mask) === 0 && exponent > 0; mask >>= 1) exponent--;
  return ~(sign | (exponent << 4) | ((s >> (exponent + 3)) & 0x0f)) & 0xff;
}

/** 16 kHz mono 16-bit samples: from a WAV file, or 1.5 s of a 600 Hz tone */
function loadAudio() {
  if (!wavFile) {
    return Int16Array.from(
      { length: 24000 },
      (_, i) => Math.sin((2 * Math.PI * 600 * i) / 16000) * 8000,
    );
  }
  const wav = readFileSync(wavFile);
  const sampleRate = wav.readUInt32LE(24);
  const channels = wav.readUInt16LE(22);
  if (sampleRate !== 16000 || channels !== 1) throw new Error("Use a 16 kHz mono 16-bit WAV file.");
  const data = wav.indexOf("data") + 8;
  return new Int16Array(wav.buffer.slice(wav.byteOffset + data, wav.byteOffset + wav.length));
}

// 1. a radio token for this integration
const response = await fetch(`${API}/radio/external/token`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "snaily-cad-api-token": TOKEN },
  body: JSON.stringify({ name: "Node example", identity: "example:node-radio", kind: "external" }),
});
if (!response.ok) throw new Error(`token: HTTP ${response.status} ${await response.text()}`);
const radio = await response.json();
const channel = radio.channels.find((c) => c.name === channelName);
if (!channel) {
  throw new Error(
    `No channel "${channelName}". Channels: ${radio.channels.map((c) => c.name).join(", ")}`,
  );
}

// 2. connect, say hello, join
const ws = new WebSocket(radio.wsUrl);
const send = (message) => ws.send(JSON.stringify(message));
let handle = null;

ws.on("open", () => send({ t: "hello", token: radio.token, client: "node-example/1.0" }));
ws.on("message", (data, isBinary) => {
  if (isBinary) return; // audio from others: bytes 6.. are mu-law samples (see protocol.md)
  const message = JSON.parse(data.toString());
  switch (message.t) {
    case "ready": {
      send({ t: "join", channel: channel.id, mode: "member" });
      break;
    }
    case "joined": {
      handle = message.handle;
      console.log(
        `joined ${channelName}, members: ${message.members.map((m) => m.name).join(", ")}`,
      );
      // 3. push to talk: wait for "granted" before sending audio
      send({ t: "ptt", channel: channel.id, on: true });
      break;
    }
    case "granted": {
      transmit();
      break;
    }
    case "busy": {
      console.log(`busy: ${message.by} is talking, try again later`);
      ws.close();
      break;
    }
    case "talk": {
      console.log(`${message.name} ${message.on ? "started" : "stopped"} talking`);
      break;
    }
    case "error": {
      console.error(`error: ${message.code} ${message.message}`);
      if (message.fatal) ws.close();
      break;
    }
    default: {
      break;
    }
  }
});

// 4. send 20 ms frames (320 samples) in real time, then release the channel
function transmit() {
  const pcm = loadAudio();
  let offset = 0;
  let seq = 0;
  const timer = setInterval(() => {
    if (offset >= pcm.length) {
      clearInterval(timer);
      send({ t: "ptt", channel: channel.id, on: false });
      console.log("done");
      setTimeout(() => ws.close(), 500);
      return;
    }
    const frame = Buffer.alloc(6 + 320);
    frame[0] = 1; // audio
    frame[1] = 1; // mu-law 16 kHz
    frame.writeUInt16BE(handle, 2);
    frame.writeUInt16BE(seq++ & 0xffff, 4);
    for (let i = 0; i < 320; i++) frame[6 + i] = mulaw(pcm[offset + i] ?? 0);
    ws.send(frame);
    offset += 320;
  }, 20);
}
