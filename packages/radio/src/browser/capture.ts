import { AUDIO_FRAME_SAMPLES, AUDIO_SAMPLE_RATE } from "../protocol";

/**
 * Microphone -> 16 kHz mono frames of 320 samples. Runs in an AudioWorklet (falls back to a
 * ScriptProcessor). Browsers only give microphone access on HTTPS (or localhost) pages.
 */

const WORKLET_SOURCE = `
class SnailyRadioCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ratio = sampleRate / ${AUDIO_SAMPLE_RATE};
    this.frame = new Float32Array(${AUDIO_FRAME_SAMPLES});
    this.length = 0;
    this.position = 0;
    this.sum = 0;
    this.count = 0;
  }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    for (let i = 0; i < input.length; i++) {
      // box filter + decimation: enough for radio-bandwidth audio
      this.sum += input[i];
      this.count++;
      this.position += 1;
      if (this.position >= this.ratio) {
        this.position -= this.ratio;
        this.frame[this.length++] = this.sum / this.count;
        this.sum = 0;
        this.count = 0;
        if (this.length === this.frame.length) {
          this.port.postMessage(this.frame.slice());
          this.length = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("snaily-radio-capture", SnailyRadioCapture);
`;

export interface MicrophoneOptions {
  deviceId?: string;
  /** called with every 20 ms frame while `transmitting` is true */
  onFrame: (samples: Float32Array) => void;
  /** input level 0..1, about 50 times a second while open */
  onLevel?: (level: number) => void;
}

export function canCaptureMicrophone() {
  return (
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && isSecureContext
  );
}

export class Microphone {
  transmitting = false;
  #context: AudioContext;
  #options: MicrophoneOptions;
  #stream: MediaStream | null = null;
  #source: MediaStreamAudioSourceNode | null = null;
  #node: AudioNode | null = null;
  #opening: Promise<void> | null = null;
  #gain = 1;

  constructor(context: AudioContext, options: MicrophoneOptions) {
    this.#context = context;
    this.#options = options;
  }

  get isOpen() {
    return !!this.#stream;
  }

  get stream() {
    return this.#stream;
  }

  /** microphone gain, 0..2 */
  setGain(gain: number) {
    this.#gain = Math.max(0, Math.min(2, gain));
  }

  /** opens the microphone (asks for permission the first time) */
  open() {
    this.#opening ??= this.#open().catch((error) => {
      this.#opening = null;
      throw error;
    });
    return this.#opening;
  }

  async #open() {
    if (!canCaptureMicrophone()) {
      throw new Error(
        "Microphone access needs the CAD to be opened over HTTPS (or on localhost) in a current browser.",
      );
    }
    this.#stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: this.#options.deviceId ? { exact: this.#options.deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });
    this.#source = this.#context.createMediaStreamSource(this.#stream);
    this.#node = await this.#createProcessor();
    this.#source.connect(this.#node);
  }

  async #createProcessor(): Promise<AudioNode> {
    const handle = (frame: Float32Array) => {
      if (this.#gain !== 1) for (let i = 0; i < frame.length; i++) frame[i]! *= this.#gain;
      if (this.#options.onLevel) {
        let peak = 0;
        for (let i = 0; i < frame.length; i++) peak = Math.max(peak, Math.abs(frame[i]!));
        this.#options.onLevel(Math.min(1, peak));
      }
      if (this.transmitting) this.#options.onFrame(frame);
    };

    if (this.#context.audioWorklet) {
      const url = URL.createObjectURL(
        new Blob([WORKLET_SOURCE], { type: "application/javascript" }),
      );
      try {
        await this.#context.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      const node = new AudioWorkletNode(this.#context, "snaily-radio-capture");
      node.port.onmessage = (event: MessageEvent<Float32Array>) => handle(event.data);
      return node;
    }

    // older engines: ScriptProcessor with the same decimation on the main thread
    const processor = this.#context.createScriptProcessor(4096, 1, 1);
    const ratio = this.#context.sampleRate / AUDIO_SAMPLE_RATE;
    let frame = new Float32Array(AUDIO_FRAME_SAMPLES);
    let length = 0;
    let position = 0;
    let sum = 0;
    let count = 0;
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      for (let i = 0; i < input.length; i++) {
        sum += input[i]!;
        count++;
        position += 1;
        if (position >= ratio) {
          position -= ratio;
          frame[length++] = sum / count;
          sum = 0;
          count = 0;
          if (length === frame.length) {
            handle(frame);
            frame = new Float32Array(AUDIO_FRAME_SAMPLES);
            length = 0;
          }
        }
      }
    };
    // a ScriptProcessor only runs while connected to the destination; it outputs silence
    processor.connect(this.#context.destination);
    return processor;
  }

  close() {
    this.transmitting = false;
    this.#source?.disconnect();
    this.#node?.disconnect();
    for (const track of this.#stream?.getTracks() ?? []) track.stop();
    this.#stream = null;
    this.#source = null;
    this.#node = null;
    this.#opening = null;
  }
}
