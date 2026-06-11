import {
  getdaisyaudiocontext,
  getdaisyengine,
  setdaisysynthplayvolume,
} from './daisyengine'
import type { DAISY_SYNTH } from './daisysynth'

const WARM_DRUM_DELTA_MS = 500
const WARM_DRUM_TAIL_MS = 1000

export function schedulewarmdaisydrums(synth: DAISY_SYNTH) {
  const ctx = getdaisyaudiocontext()
  const engine = getdaisyengine()
  if (!ctx || !engine) {
    return
  }
  if ('isOffline' in ctx && ctx.isOffline) {
    return
  }

  const saved = synth.getplayvolume()
  setdaisysynthplayvolume(0)

  setTimeout(() => {
    synth.warmdrums()
  }, WARM_DRUM_DELTA_MS)

  setTimeout(() => {
    setdaisysynthplayvolume(saved)
  }, WARM_DRUM_DELTA_MS + WARM_DRUM_TAIL_MS)
}
