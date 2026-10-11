/* eslint-disable unicorn/number-literal-case, quotes -- hex test values; JSON strings in single quotes */
import { describe, expect, test } from "vitest";
import {
  AUDIO_FRAME_HEADER_BYTES,
  AUDIO_FRAME_SAMPLES,
  decodeAudioFrame,
  encodeAudioFrame,
  livekitRoomName,
  mulawDecode,
  mulawDecodeSample,
  mulawEncode,
  mulawEncodeSample,
  parseClientMessage,
  withHandle,
} from "../src";

describe("mu-law", () => {
  test("silence stays silent", () => {
    expect(mulawDecodeSample(mulawEncodeSample(0))).toBe(0);
  });

  test("round trip stays within the codec's step size", () => {
    for (const sample of [-32_000, -12_345, -1000, -50, 50, 1000, 12_345, 32_000]) {
      const decoded = mulawDecodeSample(mulawEncodeSample(sample));
      // mu-law error grows with loudness: under 4% (plus a small absolute floor)
      expect(Math.abs(decoded - sample)).toBeLessThanOrEqual(Math.abs(sample) * 0.04 + 16);
      expect(Math.sign(decoded)).toBe(Math.sign(sample));
    }
  });

  test("clips instead of wrapping", () => {
    expect(mulawDecodeSample(mulawEncodeSample(100_000))).toBeGreaterThan(30_000);
    expect(mulawDecodeSample(mulawEncodeSample(-100_000))).toBeLessThan(-30_000);
  });

  test("float frames round trip", () => {
    const samples = Float32Array.from({ length: AUDIO_FRAME_SAMPLES }, (_, i) =>
      Math.sin((i / AUDIO_FRAME_SAMPLES) * Math.PI * 8),
    );
    const encoded = mulawEncode(samples);
    expect(encoded).toHaveLength(AUDIO_FRAME_SAMPLES);
    const decoded = mulawDecode(encoded);
    for (let i = 0; i < samples.length; i++) {
      expect(Math.abs(decoded[i]! - samples[i]!)).toBeLessThan(0.05);
    }
  });
});

describe("audio frames", () => {
  test("encode / decode", () => {
    const payload = new Uint8Array(AUDIO_FRAME_SAMPLES).fill(0x7f);
    const frame = encodeAudioFrame(0x1234, 0xbeef, payload);
    expect(frame).toHaveLength(AUDIO_FRAME_HEADER_BYTES + AUDIO_FRAME_SAMPLES);

    const decoded = decodeAudioFrame(frame);
    expect(decoded).not.toBeNull();
    expect(decoded!.handle).toBe(0x1234);
    expect(decoded!.seq).toBe(0xbeef);
    expect(decoded!.codec).toBe(1);
    expect(decoded!.payload).toEqual(payload);
  });

  test("withHandle rewrites only the handle, on a copy", () => {
    const frame = encodeAudioFrame(1, 7, new Uint8Array([1, 2, 3]));
    const rewritten = withHandle(frame, 513);
    expect(decodeAudioFrame(rewritten)!.handle).toBe(513);
    expect(decodeAudioFrame(rewritten)!.seq).toBe(7);
    expect(decodeAudioFrame(frame)!.handle).toBe(1);
  });

  test("rejects frames that aren't audio", () => {
    expect(decodeAudioFrame(new Uint8Array([2, 1, 0, 1, 0, 1, 9]))).toBeNull();
    expect(decodeAudioFrame(new Uint8Array([1, 1, 0, 1]))).toBeNull();
  });
});

describe("control messages", () => {
  test("parses JSON messages with a type", () => {
    expect(parseClientMessage('{"t":"join","channel":"a"}')).toEqual({ t: "join", channel: "a" });
  });

  test("ignores garbage", () => {
    expect(parseClientMessage("not json")).toBeNull();
    expect(parseClientMessage('{"channel":"a"}')).toBeNull();
    expect(parseClientMessage("null")).toBeNull();
  });

  test("LiveKit room names", () => {
    expect(livekitRoomName("abc")).toBe("snaily-radio-abc");
  });
});
