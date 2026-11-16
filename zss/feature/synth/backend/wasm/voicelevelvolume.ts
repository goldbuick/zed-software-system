/**
 * Per-`#synth` type volume (dB) so mid-window RMS lands near `#synth square`.
 * From offline voice-level sweep (comp/SC/limiter bypassed); see ops/lib/daisy-parity/voicelevelsweep.ts.
 */
export const VOICE_LEVEL_VOLUME_DB: Record<string, number> = {
  square: 0,
  pwm: -3.0,
  sine: -8.3,
  triangle: -0.3,
  sawtooth: -0.2,
  pulse: -0.9,
  custom: 0,
  amsine: -2.7,
  amsquare: 0,
  amtriangle: -1.7,
  amsawtooth: -0.7,
  fmsine: -7.4,
  fmsquare: -1.1,
  fmtriangle: 2.9,
  fmsawtooth: 2.0,
  fatsine: 4.7,
  fatsquare: 1.9,
  fattriangle: 4.7,
  fatsawtooth: 4.7,
  retro: 4.8,
  buzz: 5.2,
  clang: 4.4,
  metallic: 5.9,
  noise: 6.8,
  hollow: 5.9,
  bells: 18.4,
  doot: -1.6,
  algo0: 10.4,
  algo1: 11.6,
  algo2: 10.2,
  algo3: 10.3,
  algo4: 7.2,
  algo5: 12.8,
  algo6: 10.3,
  algo7: 12.3,
  string: -0.1,
  pluck: 2.5,
  flute: -0.9,
  clarinet: -1.1,
  brass: -2.0,
  piano: 2.5,
  violin: -0.2,
  steel: 0.8,
  tonewheel: -10.0,
}

export function voicelevelvolumedb(typename: string): number {
  return VOICE_LEVEL_VOLUME_DB[typename] ?? 0
}
