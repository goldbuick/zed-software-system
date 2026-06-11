/** Tone.js AutoFilter defaults — ZSS reset matches fx.ts applyreset. */
export const WASM_AUTOFILTER_DEFAULT_FREQUENCY = 3
export const WASM_AUTOFILTER_DEFAULT_DEPTH = 0.5
export const WASM_AUTOFILTER_DEFAULT_BASE_FREQ = 200
export const WASM_AUTOFILTER_DEFAULT_OCTAVES = 5
export const WASM_AUTOFILTER_DEFAULT_Q = 1

export const WASM_AUTOFILTER_TYPE = {
  LOWPASS: 0,
  HIGHPASS: 1,
  BANDPASS: 2,
  LOWSHELF: 3,
  HIGHSHELF: 4,
  PEAKING: 5,
  NOTCH: 6,
  ALLPASS: 7,
} as const

export type WASM_AUTOFILTER_TYPE_ID =
  (typeof WASM_AUTOFILTER_TYPE)[keyof typeof WASM_AUTOFILTER_TYPE]

const FILTER_TYPE_NAMES: Record<WASM_AUTOFILTER_TYPE_ID, string> = {
  [WASM_AUTOFILTER_TYPE.LOWPASS]: 'lowpass',
  [WASM_AUTOFILTER_TYPE.HIGHPASS]: 'highpass',
  [WASM_AUTOFILTER_TYPE.BANDPASS]: 'bandpass',
  [WASM_AUTOFILTER_TYPE.LOWSHELF]: 'lowshelf',
  [WASM_AUTOFILTER_TYPE.HIGHSHELF]: 'highshelf',
  [WASM_AUTOFILTER_TYPE.PEAKING]: 'peaking',
  [WASM_AUTOFILTER_TYPE.NOTCH]: 'notch',
  [WASM_AUTOFILTER_TYPE.ALLPASS]: 'allpass',
}

export function autofiltermaxhz(
  basefreq: number,
  octaves: number,
  samplerate: number,
): number {
  const base = basefreq > 0 ? basefreq : WASM_AUTOFILTER_DEFAULT_BASE_FREQ
  const oct = octaves > 0 ? octaves : WASM_AUTOFILTER_DEFAULT_OCTAVES
  return Math.min(base * Math.pow(2, oct), samplerate * 0.5)
}

/** Tone LFO: sine * depth → unipolar → scale min..max cutoff. */
export function autofiltercutoffhz(
  lfo: number,
  basefreq: number,
  octaves: number,
  depth: number,
  samplerate: number,
): number {
  const minhz = basefreq > 0 ? basefreq : WASM_AUTOFILTER_DEFAULT_BASE_FREQ
  const maxhz = autofiltermaxhz(basefreq, octaves, samplerate)
  const d = depth > 0 ? depth : WASM_AUTOFILTER_DEFAULT_DEPTH
  const unipolar = (lfo * d + 1) * 0.5
  return minhz + (maxhz - minhz) * unipolar
}

export function autofiltertypename(typeid: number): string {
  const id = Math.round(typeid) as WASM_AUTOFILTER_TYPE_ID
  return (
    FILTER_TYPE_NAMES[id] ?? FILTER_TYPE_NAMES[WASM_AUTOFILTER_TYPE.LOWPASS]
  )
}

export function parseautofiltertype(
  value: string,
): WASM_AUTOFILTER_TYPE_ID | undefined {
  switch (value) {
    case 'lowpass':
      return WASM_AUTOFILTER_TYPE.LOWPASS
    case 'highpass':
      return WASM_AUTOFILTER_TYPE.HIGHPASS
    case 'bandpass':
      return WASM_AUTOFILTER_TYPE.BANDPASS
    case 'lowshelf':
      return WASM_AUTOFILTER_TYPE.LOWSHELF
    case 'highshelf':
      return WASM_AUTOFILTER_TYPE.HIGHSHELF
    case 'peaking':
      return WASM_AUTOFILTER_TYPE.PEAKING
    case 'notch':
      return WASM_AUTOFILTER_TYPE.NOTCH
    case 'allpass':
      return WASM_AUTOFILTER_TYPE.ALLPASS
    default:
      return undefined
  }
}

export function autofilterlfophase(
  phase: number,
  frequency: number,
  samplerate: number,
): number {
  const hz = frequency > 0 ? frequency : WASM_AUTOFILTER_DEFAULT_FREQUENCY
  let next = phase + (6.28318530718 * hz) / samplerate
  if (next >= 6.28318530718) {
    next -= 6.28318530718
  }
  return next
}

export function autofiltersine(phase: number): number {
  return Math.sin(phase)
}
