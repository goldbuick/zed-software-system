import { isnumber } from 'zss/mapping/types'

import { createvoicefxconfighandler } from './common'

export const synthvoicefxreverbconfig = createvoicefxconfighandler(
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
