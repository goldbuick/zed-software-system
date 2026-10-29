import type { createdaisysynth } from 'zss/feature/synth/backend/daisy/daisysynth'
import { SYNTH_PLAY_VOICE_COUNT } from 'zss/feature/synth/synthdefaults'

import type { PARITY_PATCH } from './paritypatches'

export function applydaisyparityvoiceconfigs(
  synth: ReturnType<typeof createdaisysynth>,
  patch: PARITY_PATCH,
) {
  if (patch.voiceconfigs) {
    for (let ch = 0; ch < SYNTH_PLAY_VOICE_COUNT; ch++) {
      for (const [config, value] of patch.voiceconfigs) {
        synth.setvoiceconfig(ch, config, value)
      }
    }
    return
  }
  synth.setvoiceconfig(patch.voiceindex, patch.voiceconfig, '')
}
