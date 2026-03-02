import { isnumber } from 'zss/mapping/types'

import { createVoiceFxConfigHandler } from './common'

export const synthvoicefxreverbconfig = createVoiceFxConfigHandler(
  'reverb',
  (synth) => synth.FXCHAIN.reverb,
  (reverb, config, value) => {
    switch (config) {
      case 'decay':
        if (isnumber(value)) {
          reverb.set({ decay: value })
          return true
        }
        break
      case 'predelay':
        if (isnumber(value)) {
          reverb.set({ preDelay: value })
          return true
        }
        break
    }
    return false
  },
)
