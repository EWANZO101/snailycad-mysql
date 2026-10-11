/**
 * Synthesised radio tones, so no sound files have to be shipped (also in the FiveM NUI).
 */

export type RadioToneName = "permit" | "roger" | "busy" | "alert" | "panic" | "beep" | "error";

type Step = [frequency: number, seconds: number, volume?: number];

const TONES: Record<RadioToneName, Step[]> = {
  // talk permit: short high chirp
  permit: [
    [1400, 0.05],
    [0, 0.02],
    [1800, 0.05],
  ],
  // end of transmission
  roger: [[1200, 0.07]],
  // channel busy: low bonk bonk
  busy: [
    [420, 0.12],
    [0, 0.06],
    [420, 0.12],
    [0, 0.06],
    [420, 0.12],
  ],
  // dispatch alert: three-tone
  alert: [
    [880, 0.18],
    [1175, 0.18],
    [1568, 0.3],
  ],
  // panic: fast alternating hi/lo
  panic: Array.from({ length: 8 }, (_, i): Step => [i % 2 ? 960 : 1440, 0.12]),
  beep: [[1000, 0.12]],
  error: [[300, 0.25]],
};

export function isRadioTone(name: string): name is RadioToneName {
  return name in TONES;
}

/** plays a tone through `destination`; resolves when it has finished */
export function playTone(
  context: AudioContext,
  destination: AudioNode,
  name: RadioToneName,
  volume = 0.25,
) {
  const steps = TONES[name];
  let time = context.currentTime + 0.01;
  for (const [frequency, seconds, stepVolume] of steps) {
    if (frequency > 0) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      const level = (stepVolume ?? 1) * volume * 0.5;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(level, time + 0.005);
      gain.gain.setValueAtTime(level, time + seconds - 0.01);
      gain.gain.linearRampToValueAtTime(0, time + seconds);
      oscillator.connect(gain).connect(destination);
      oscillator.start(time);
      oscillator.stop(time + seconds + 0.01);
    }
    time += seconds;
  }
  const total = time - context.currentTime;
  return new Promise<void>((resolve) => setTimeout(resolve, total * 1000));
}
