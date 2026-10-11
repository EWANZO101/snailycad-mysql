/**
 * G.711 mu-law: 16-bit PCM <-> 8-bit samples. Radio-grade audio at 16 kB/s that any language can
 * encode in a few lines (see docs/radio/integrations.md).
 */

const BIAS = 0x84;
const CLIP = 32_635;

const DECODE_TABLE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  const value = ~i & 0xff;
  const sign = value & 0x80;
  const exponent = (value >> 4) & 0x07;
  const mantissa = value & 0x0f;
  let sample = ((mantissa << 3) + BIAS) << exponent;
  sample -= BIAS;
  DECODE_TABLE[i] = sign ? -sample : sample;
}

export function mulawEncodeSample(pcm: number): number {
  let sample = Math.max(-32_768, Math.min(32_767, Math.round(pcm)));
  const sign = sample < 0 ? 0x80 : 0;
  if (sign) sample = -sample;
  if (sample > CLIP) sample = CLIP;
  sample += BIAS;

  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; mask >>= 1) exponent--;
  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  return ~(sign | (exponent << 4) | mantissa) & 0xff;
}

export function mulawDecodeSample(byte: number): number {
  return DECODE_TABLE[byte & 0xff]!;
}

/** float samples in [-1, 1] -> mu-law bytes */
export function mulawEncode(samples: Float32Array): Uint8Array {
  const out = new Uint8Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = mulawEncodeSample(samples[i]! * 32_767);
  return out;
}

/** mu-law bytes -> float samples in [-1, 1] */
export function mulawDecode(bytes: Uint8Array): Float32Array {
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = DECODE_TABLE[bytes[i]!]! / 32_768;
  return out;
}
