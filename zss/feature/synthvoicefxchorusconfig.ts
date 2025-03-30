import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { isnumber, ispresent, MAYBE } from 'zss/mapping/types'

import { AUDIO_SYNTH } from './synth'

export function synthvoicefxchorusconfig(
  synth: MAYBE<AUDIO_SYNTH>,
  index: number,
  config: number | string,
  value: number | string,
) {
  if (!ispresent(synth) || index < 0 || index >= synth.FX.length) {
    api_error(SOFTWARE, `synth`, `index ${index} out of bounds`)
    return
  }
  const chorus = synth.FX[index].chorus
  switch (config) {
    case 'frequency':
      if (isnumber(value)) {
        chorus.set({
          frequency: value,
        })
        return
      }
      break
    case 'delaytime':
      if (isnumber(value)) {
        chorus.set({
          delayTime: value,
        })
        return
      }
      break
  }
  api_error(SOFTWARE, `kind`, `unknown chorus ${config} or ${value}`)
}
