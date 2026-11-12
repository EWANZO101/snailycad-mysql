/* eslint-disable unicorn/number-literal-case -- G.711 bit masks */
/**
 * Audio conversion between the SnailyCAD radio (16 kHz mono G.711 mu-law, 20 ms = 320 samples)
 * and Discord (48 kHz stereo 16-bit PCM, 20 ms = 960 samples per channel = 3840 bytes).
 */

export const RADIO_RATE = 16_000;
export const RADIO_FRAME = 320;
export const DISCORD_FRAME_BYTES = 3840;

/** 16-bit PCM sample -> 8-bit mu-law */
export function mulawEncodeSample(sample) {
  const BIAS = 0x84;
  let s = Math.max(-32768, Math.min(32767, Math.round(sample)));
  const sign = s < 0 ? 0x80 : 0;
  if (sign) s = -s;
  s = Math.min(s, 32635) + BIAS;
  let exponent = 7;
  for (let mask = 0x4000; (s & mask) === 0 && exponent > 0; mask >>= 1) exponent--;
  return ~(sign | (exponent << 4) | ((s >> (exponent + 3)) & 0x0f)) & 0xff;
}

/** 8-bit mu-law -> 16-bit PCM sample */
export function mulawDecodeSample(byte) {
  const u = ~byte & 0xff;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  const magnitude = (((mantissa << 3) + 0x84) << exponent) - 0x84;
  return sign ? -magnitude : magnitude;
}

export function mulawEncode(pcm) {
  const out = Buffer.alloc(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = mulawEncodeSample(pcm[i]);
  return out;
}

export function mulawDecode(bytes) {
  const out = new Int16Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = mulawDecodeSample(bytes[i]);
  return out;
}

/**
 * 16 kHz mono -> 48 kHz stereo s16le (what @discordjs/voice plays as StreamType.Raw).
 * Linear interpolation; `state.last` carries the previous frame's last sample so frames join up.
 */
export function radioToDiscord(pcm, volume = 1, state = { last: 0 }) {
  const out = Buffer.alloc(pcm.length * 3 * 2 * 2);
  let previous = state.last;
  let offset = 0;
  for (let i = 0; i < pcm.length; i++) {
    const current = pcm[i];
    for (let step = 1; step <= 3; step++) {
      const value = previous + ((current - previous) * step) / 3;
      const sample = Math.max(-32768, Math.min(32767, Math.round(value * volume)));
      out.writeInt16LE(sample, offset);
      out.writeInt16LE(sample, offset + 2);
      offset += 4;
    }
    previous = current;
  }
  state.last = previous;
  return out;
}

/** 48 kHz stereo s16le -> 16 kHz mono (average of 3 frames x 2 channels: a simple low-pass) */
export function discordToRadio(buffer) {
  const frames = Math.floor(buffer.length / 4);
  const out = new Int16Array(Math.floor(frames / 3));
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (let j = 0; j < 3; j++) {
      const at = (i * 3 + j) * 4;
      sum += buffer.readInt16LE(at) + buffer.readInt16LE(at + 2);
    }
    out[i] = Math.round(sum / 6);
  }
  return out;
}

/** collects samples and hands out exact 320-sample (20 ms) radio frames */
export class FrameChunker {
  #pending = new Int16Array(0);

  /** returns the complete frames available after adding `samples` */
  push(samples) {
    const all = new Int16Array(this.#pending.length + samples.length);
    all.set(this.#pending);
    all.set(samples, this.#pending.length);
    const frames = [];
    let offset = 0;
    while (all.length - offset >= RADIO_FRAME) {
      frames.push(all.slice(offset, offset + RADIO_FRAME));
      offset += RADIO_FRAME;
    }
    this.#pending = all.slice(offset);
    return frames;
  }

  /** the rest, padded with silence to a full frame (or null when empty) */
  flush() {
    if (!this.#pending.length) return null;
    const frame = new Int16Array(RADIO_FRAME);
    frame.set(this.#pending);
    this.#pending = new Int16Array(0);
    return frame;
  }
}

/** a 48 kHz stereo tone (e.g. the "busy" beep played to a Discord speaker's channel) */
export function toneForDiscord(frequency, ms, amplitude = 6000) {
  const samples = Math.round((48_000 * ms) / 1000);
  const out = Buffer.alloc(samples * 4);
  for (let i = 0; i < samples; i++) {
    const fade = Math.min(1, i / 480, (samples - i) / 480);
    const value = Math.round(Math.sin((2 * Math.PI * frequency * i) / 48_000) * amplitude * fade);
    out.writeInt16LE(value, i * 4);
    out.writeInt16LE(value, i * 4 + 2);
  }
  return out;
}
