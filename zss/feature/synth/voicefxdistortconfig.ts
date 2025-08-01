import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'

import { AUDIO_SYNTH } from '.'

export function synthvoicefxdistortionconfig(
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
  const distortion = synth.FXCHAIN.distortion
  switch (config) {
    case 'distortion':
      if (isnumber(value)) {
        distortion.set({
          distortion: value,
        })
        return
      }
      break
    case 'oversample':
      if (isstring(value)) {
        distortion.set({
          oversample: value as OverSampleType,
        })
        return
      }
      break
  }
  api_error(
    SOFTWARE,
    player,
    `kind`,
    `unknown distortion ${config} or ${value}`,
  )
}
