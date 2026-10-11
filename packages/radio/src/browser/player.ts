import { AUDIO_SAMPLE_RATE } from "../protocol";

/**
 * Plays received radio audio. One ChannelOutput per channel, each with its own volume (used for
 * positional audio in games) and pan, all through a shared "radio" sound: band-pass 300-3400 Hz
 * and a little saturation, like a real handheld.
 */

/** how far ahead audio is scheduled to absorb network jitter */
const JITTER_SECONDS = 0.08;
/** after this much silence a stream starts fresh (new transmission) */
const RESET_AFTER_SECONDS = 0.25;

export class ChannelOutput {
  readonly gain: GainNode;
  readonly panner: StereoPannerNode | null;
  #context: AudioContext;
  #nextTime = 0;
  #volume = 1;
  #muted = false;

  constructor(context: AudioContext, destination: AudioNode) {
    this.#context = context;
    this.gain = context.createGain();
    this.panner =
      typeof context.createStereoPanner === "function" ? context.createStereoPanner() : null;
    if (this.panner) {
      this.gain.connect(this.panner);
      this.panner.connect(destination);
    } else {
      this.gain.connect(destination);
    }
  }

  /** 0..1 */
  setVolume(volume: number) {
    this.#volume = Math.max(0, Math.min(1, volume));
    this.#apply();
  }

  get volume() {
    return this.#volume;
  }

  setMuted(muted: boolean) {
    this.#muted = muted;
    this.#apply();
  }

  /** -1 (left) .. 1 (right) */
  setPan(pan: number) {
    if (this.panner) this.panner.pan.value = Math.max(-1, Math.min(1, pan));
  }

  #apply() {
    const target = this.#muted ? 0 : this.#volume;
    this.gain.gain.setTargetAtTime(target, this.#context.currentTime, 0.05);
  }

  /** queues 16 kHz float samples */
  play(samples: Float32Array) {
    const context = this.#context;
    const now = context.currentTime;
    if (this.#nextTime < now || this.#nextTime - now > RESET_AFTER_SECONDS + JITTER_SECONDS) {
      this.#nextTime = now + JITTER_SECONDS;
    }
    const buffer = context.createBuffer(1, samples.length, AUDIO_SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    source.start(this.#nextTime);
    this.#nextTime += buffer.duration;
  }

  disconnect() {
    this.gain.disconnect();
    this.panner?.disconnect();
  }
}

function saturationCurve(amount: number) {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i * 2) / curve.length - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

export class RadioOutput {
  readonly context: AudioContext;
  /** everything radio, including tones; 0..1 */
  readonly master: GainNode;
  readonly #effectInput: AudioNode;
  #channels = new Map<string, ChannelOutput>();

  constructor(context: AudioContext, { effect = true }: { effect?: boolean } = {}) {
    this.context = context;
    this.master = context.createGain();
    this.master.connect(context.destination);

    if (!effect) {
      this.#effectInput = this.master;
      return;
    }
    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 300;
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 3400;
    const shaper = context.createWaveShaper();
    shaper.curve = saturationCurve(2.5);
    const makeup = context.createGain();
    makeup.gain.value = 0.9;
    highpass.connect(lowpass).connect(shaper).connect(makeup).connect(this.master);
    this.#effectInput = highpass;
  }

  setVolume(volume: number) {
    this.master.gain.value = Math.max(0, Math.min(1, volume));
  }

  channel(id: string) {
    let output = this.#channels.get(id);
    if (!output) {
      output = new ChannelOutput(this.context, this.#effectInput);
      this.#channels.set(id, output);
    }
    return output;
  }

  remove(id: string) {
    this.#channels.get(id)?.disconnect();
    this.#channels.delete(id);
  }

  /** browsers start audio suspended until the user interacts with the page */
  resume() {
    return this.context.state === "suspended" ? this.context.resume() : Promise.resolve();
  }
}
