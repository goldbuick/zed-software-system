import { getmaxiengine, getmaximaudiocontext } from './maximilian'
import type { WASM_SYNTH } from './maxisynth'

/** Parity with Tone `warmdrums` in audiochain.ts. */
const WARM_DRUM_DELTA_MS = 500
const WARM_DRUM_TAIL_MS = 1000

export function schedulewarmwasmdrums(synth: WASM_SYNTH) {
  const ctx = getmaximaudiocontext()
  const maxi = getmaxiengine()
  if (!ctx || !maxi) {
    return
  }
  if ('isOffline' in ctx && ctx.isOffline) {
    return
  }

  maxi.setGain(0)

  setTimeout(() => {
    synth.warmdrums()
  }, WARM_DRUM_DELTA_MS)

  setTimeout(() => {
    maxi.setGain(1)
  }, WARM_DRUM_DELTA_MS + WARM_DRUM_TAIL_MS)
}
