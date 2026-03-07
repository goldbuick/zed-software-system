import { isnumber } from 'zss/mapping/types'

import { createVoiceFxConfigHandler } from './common'

export const synthvoicefxfcrushconfig = createVoiceFxConfigHandler(
  'fcrush',
  (synth) => synth.FXCHAIN.fcrush,
  (fcrush, config, value) => {
    switch (config) {
      case 'rate':
        if (isnumber(value)) {
          fcrush.set({ rate: value })
          return true
        }
        break
    }
    return false
  },
)
