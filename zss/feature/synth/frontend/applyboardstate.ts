import type { SYNTH_STATE } from 'zss/gadget/data/types'
import { NAME } from 'zss/words/types'

import type { SynthBackend } from './synthbackend'

export function applyboardstate(
  backend: SynthBackend,
  synthstate: SYNTH_STATE,
) {
  const idxvoices = Object.keys(synthstate.voices).map(Number)
  for (let i = 0; i < idxvoices.length; ++i) {
    const idx = idxvoices[i]
    const voice = synthstate.voices[idx]
    if (!voice) {
      continue
    }
    const configs = Object.keys(voice)
    for (let j = 0; j < configs.length; ++j) {
      const config = configs[j]
      const value = voice[config]
      if (NAME(config) !== 'restart') {
        backend.setvoiceconfig(idx, config, value ?? '')
      }
    }
  }
  backend.replayvoicefx(synthstate.voicefx)
}
