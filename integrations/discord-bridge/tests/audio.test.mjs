import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DISCORD_FRAME_BYTES,
  FrameChunker,
  RADIO_FRAME,
  discordToRadio,
  mulawDecode,
  mulawEncode,
  radioToDiscord,
} from "../src/audio.mjs";

test("mu-law round trip stays close (G.711 is lossy, ~3% at full scale)", () => {
  for (const sample of [0, 1, -1, 100, -100, 1000, -1000, 8000, -8000, 32000, -32000]) {
    const back = mulawDecode(mulawEncode(Int16Array.of(sample)))[0];
    assert.ok(
      Math.abs(back - sample) <= Math.max(8, Math.abs(sample) * 0.04),
      `${sample} -> ${back}`,
    );
  }
});

test("a 20 ms radio frame becomes a 20 ms Discord frame and back", () => {
  const radio = Int16Array.from({ length: RADIO_FRAME }, (_, i) => Math.sin(i / 5) * 10000);
  const discord = radioToDiscord(radio);
  assert.equal(discord.length, DISCORD_FRAME_BYTES);
  const back = discordToRadio(discord);
  assert.equal(back.length, RADIO_FRAME);
  // a 500 Hz tone survives the round trip
  let error = 0;
  for (let i = 1; i < RADIO_FRAME; i++) error += Math.abs(back[i] - radio[i]);
  assert.ok(error / RADIO_FRAME < 1500, `mean error ${error / RADIO_FRAME}`);
});

test("stereo channels are averaged and volume is applied", () => {
  const buffer = Buffer.alloc(12);
  for (let i = 0; i < 3; i++) {
    buffer.writeInt16LE(1000, i * 4);
    buffer.writeInt16LE(3000, i * 4 + 2);
  }
  assert.deepEqual([...discordToRadio(buffer)], [2000]);
  const loud = radioToDiscord(Int16Array.of(20000, 20000), 2, { last: 20000 });
  assert.equal(loud.readInt16LE(loud.length - 2), 32767, "clipped, not wrapped");
});

test("the chunker hands out exact frames and pads the rest", () => {
  const chunker = new FrameChunker();
  assert.equal(chunker.push(new Int16Array(300)).length, 0);
  const frames = chunker.push(new Int16Array(400).fill(7));
  assert.equal(frames.length, 2);
  assert.ok(frames.every((frame) => frame.length === RADIO_FRAME));
  const rest = chunker.flush();
  assert.equal(rest.length, RADIO_FRAME);
  assert.equal(rest[59], 7);
  assert.equal(rest[60], 0);
  assert.equal(chunker.flush(), null);
});
