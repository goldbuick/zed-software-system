import { getmaximaudiocontext, getwasmmasterchain } from './maximilian'
import type { WASM_SYNTH } from './maxisynth'

/** Parity with Tone `warmdrums` in audiochain.ts. */
const WARM_DRUM_DELTA_MS = 500
const WARM_DRUM_TAIL_MS = 1000

export function schedulewarmwasmdrums(synth: WASM_SYNTH) {
  const ctx = getmaximaudiocontext()
  const chain = getwasmmasterchain()
  if (!ctx || !chain) {
    return
  }
  if ('isOffline' in ctx && ctx.isOffline) {
    return
  }

  const gain = chain.voicegain.gain
  gain.value = 0

  setTimeout(() => {
    synth.warmdrums()
  }, WARM_DRUM_DELTA_MS)

  setTimeout(() => {
    gain.value = 1
  }, WARM_DRUM_DELTA_MS + WARM_DRUM_TAIL_MS)
}
