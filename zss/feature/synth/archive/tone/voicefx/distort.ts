import { isnumber, isstring } from 'zss/mapping/types'

import { createvoicefxconfighandler } from './common'

export const synthvoicefxdistortionconfig = createvoicefxconfighandler(
  'distort',
  (synth) => synth.FXCHAIN.distortion,
  (distortion, config, value) => {
    switch (config) {
      case 'distortion':
        if (isnumber(value)) {
          distortion.set({ distortion: value })
          return true
        }
        break
      case 'oversample':
        if (isstring(value)) {
          distortion.set({ oversample: value as OverSampleType })
          return true
        }
        break
    }
    return false
  },
)
