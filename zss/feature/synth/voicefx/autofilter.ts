import { isnumber, isstring } from 'zss/mapping/types'

import { createVoiceFxConfigHandler } from './common'

export const synthvoicefxautofilterconfig = createVoiceFxConfigHandler(
  'autofilter',
  (synth) => synth.FXCHAIN.autofilter,
  (autofilter, config, value) => {
    switch (config) {
      case 'type':
        if (isstring(value)) {
          autofilter.set({ filter: { type: value as BiquadFilterType } })
          return true
        }
        break
      case 'q':
        if (isnumber(value)) {
          autofilter.set({ filter: { Q: value } })
          return true
        }
        break
      case 'depth':
        if (isnumber(value)) {
          autofilter.set({ depth: value })
          return true
        }
        break
      case 'frequency':
        if (isnumber(value)) {
          autofilter.set({ frequency: value })
          return true
        }
        break
      case 'octaves':
        if (isnumber(value)) {
          autofilter.set({ octaves: value })
          return true
        }
        break
    }
    return false
  },
)
