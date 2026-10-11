/**
 * tones that are generated in the browser, so a CAD has working tones without uploading audio files.
 * Each step is a frequency (Hz, 0 = silence) and a duration (seconds).
 */
const BUILT_IN_TONES = {
  "two-tone": [
    [853, 1],
    [960, 3],
  ],
  "long-tone": [[1000, 3]],
  "hi-lo": [
    [960, 0.5],
    [770, 0.5],
    [960, 0.5],
    [770, 0.5],
    [960, 0.5],
    [770, 0.5],
  ],
  "alert-beeps": [
    [1050, 0.2],
    [0, 0.1],
    [1050, 0.2],
    [0, 0.1],
    [1050, 0.2],
    [0, 0.4],
    [1050, 0.2],
    [0, 0.1],
    [1050, 0.2],
    [0, 0.1],
    [1050, 0.2],
  ],
  "rising-chirp": [
    [600, 0.15],
    [800, 0.15],
    [1000, 0.15],
    [1200, 0.4],
  ],
} satisfies Record<string, [number, number][]>;

export type BuiltInToneName = keyof typeof BUILT_IN_TONES;
export const BUILT_IN_TONE_NAMES = Object.keys(BUILT_IN_TONES) as BuiltInToneName[];

const BUILT_IN_PREFIX = "builtin:";

export function isBuiltInSound(sound: string) {
  return sound.startsWith(BUILT_IN_PREFIX);
}

export function builtInSound(name: BuiltInToneName) {
  return `${BUILT_IN_PREFIX}${name}`;
}

function playBuiltIn(name: string) {
  if (!(name in BUILT_IN_TONES)) return;
  const steps = BUILT_IN_TONES[name as BuiltInToneName];

  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.gain.value = 0.15;
  gain.connect(context.destination);

  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.connect(gain);

  let time = context.currentTime;
  for (const [frequency, duration] of steps) {
    // silence is a muted step, so the oscillator keeps running and the timing stays exact
    gain.gain.setValueAtTime(frequency > 0 ? 0.15 : 0, time);
    if (frequency > 0) oscillator.frequency.setValueAtTime(frequency, time);
    time += duration;
  }

  oscillator.start();
  oscillator.stop(time);
  oscillator.onended = () => void context.close();
}

/** plays a tone preset's sound: a built-in tone or an audio file URL */
export function playToneSound(sound: string) {
  try {
    if (isBuiltInSound(sound)) {
      playBuiltIn(sound.slice(BUILT_IN_PREFIX.length));
      return;
    }

    const audio = new Audio(sound);
    audio.volume = 0.5;
    void audio.play().catch(() => {
      // the browser blocked autoplay or the file is missing
    });
  } catch {
    // audio unavailable
  }
}
