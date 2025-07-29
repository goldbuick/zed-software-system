import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

import { AUDIO_SYNTH } from './synth'

export function synthvoicefxreverbconfig(
  player: string,
  synth: MAYBE<AUDIO_SYNTH>,
  index: number,
  config: number | string,
  value: number | string,
) {
  if (!ispresent(synth) || index < 0 || index >= synth.FX.length) {
    api_error(SOFTWARE, player, `synth`, `index ${index} out of bounds`)
    return
  }
  const reverb = synth.FXCHAIN.reverb
  switch (config) {
    case 'decay':
      if (isnumber(value)) {
        reverb.set({
          decay: value,
        })
        return
      }
      break
    case 'predelay':
      if (isnumber(value)) {
        reverb.set({
          preDelay: value,
        })
        return
      }
      break
  }
  api_error(SOFTWARE, player, `kind`, `unknown reverb ${config} or ${value}`)
}
