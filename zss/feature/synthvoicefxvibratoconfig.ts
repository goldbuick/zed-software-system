import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { isnumber, ispresent, MAYBE } from 'zss/mapping/types'

import { AUDIO_SYNTH } from './synth'

export function synthvoicefxvibratoconfig(
  synth: MAYBE<AUDIO_SYNTH>,
  index: number,
  config: number | string,
  value: number | string,
) {
  if (!ispresent(synth)) {
    return
  }
  if (index < 0 || index >= synth.FX.length) {
    api_error(SOFTWARE, `synth`, `index ${index} out of bounds`)
    return
  }
  const vibrato = synth.FX[index].vibrato
  switch (config) {
    case 'maxdelay':
      if (isnumber(value)) {
        vibrato.set({
          maxDelay: value,
        })
        return
      }
      break
    case 'depth':
      if (isnumber(value)) {
        vibrato.set({
          depth: value,
        })
        return
      }
      break
  }
  api_error(SOFTWARE, `synth`, `unknown vibrato config ${config} with ${value}`)
}
