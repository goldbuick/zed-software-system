/** Tone.js AutoWah defaults — shared by SAB + unit tests. */
export const WASM_AUTOWAH_DEFAULT_BASE_FREQ = 100
export const WASM_AUTOWAH_DEFAULT_OCTAVES = 6
export const WASM_AUTOWAH_DEFAULT_SENSITIVITY = 0
export const WASM_AUTOWAH_DEFAULT_GAIN = 0
export const WASM_AUTOWAH_DEFAULT_FOLLOWER = 0.2
export const WASM_AUTOWAH_Q = 2
export const WASM_AUTOWAH_SCALE_EXP = 0.5

export function dbtogain(db: number): number {
  return Math.pow(10, db / 20)
}

export function autowahinputboost(sensitivitydb: number): number {
  const gain = dbtogain(sensitivitydb)
  if (gain <= 0) {
    return 1
  }
  return 1 / gain
}

export function autowahfolloweralpha(
  followersec: number,
  samplerate: number,
): number {
  const sec = followersec > 0 ? followersec : WASM_AUTOWAH_DEFAULT_FOLLOWER
  return 1 - Math.exp(-6.28318530718 / (sec * samplerate))
}

export function autowahmaxhz(
  basefreq: number,
  octaves: number,
  samplerate: number,
): number {
  const base = basefreq > 0 ? basefreq : WASM_AUTOWAH_DEFAULT_BASE_FREQ
  const oct = octaves > 0 ? octaves : WASM_AUTOWAH_DEFAULT_OCTAVES
  return Math.min(base * Math.pow(2, oct), samplerate * 0.5)
}

export function autowahsweephz(
  follower: number,
  basefreq: number,
  octaves: number,
  samplerate: number,
  exponent = WASM_AUTOWAH_SCALE_EXP,
): number {
  const minhz = basefreq > 0 ? basefreq : WASM_AUTOWAH_DEFAULT_BASE_FREQ
  const maxhz = autowahmaxhz(basefreq, octaves, samplerate)
  const norm = follower > 0 ? Math.pow(follower, exponent) : 0
  return minhz + (maxhz - minhz) * norm
}

export function autowahfollowerstep(
  state: number,
  sample: number,
  sensitivitydb: number,
  followersec: number,
  samplerate: number,
): number {
  const alpha = autowahfolloweralpha(followersec, samplerate)
  const boost = autowahinputboost(sensitivitydb)
  const target = Math.abs(sample * boost)
  return state + (target - state) * alpha
}
