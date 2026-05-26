/** Deterministic PRNG — BeepBox white noise uses Math.random(); we use a fixed seed. */
export const NOISE_WHITE_SEED = 0x6d2b79f5

export function noiseprngnext(state: number): [number, number] {
  let next = state + 0x6d2b79f5
  next = Math.imul(next ^ (next >>> 15), next | 1)
  next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
  const sample = ((next ^ (next >>> 14)) >>> 0) / 4294967296
  return [next, sample * 2 - 1]
}

export function noisephaseseed(voiceindex: number, notecount: number): number {
  return (
    (NOISE_WHITE_SEED ^
      ((voiceindex + 1) * 0x9e3779b9) ^
      (notecount * 0x85ebca6b)) >>>
    0
  )
}
