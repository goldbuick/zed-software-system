import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { isnumber, ispresent, MAYBE } from 'zss/mapping/types'

import { AUDIO_SYNTH } from './synth'

export function synthvoicefxphaserconfig(
  synth: MAYBE<AUDIO_SYNTH>,
  index: number,
  config: number | string,
  value: number | string,
) {
  if (!ispresent(synth) || index < 0 || index >= synth.FX.length) {
    api_error(SOFTWARE, `synth`, `index ${index} out of bounds`)
    return
  }
  const phaser = synth.FX[index].phaser
  switch (config) {
    case 'q':
      if (isnumber(value)) {
        phaser.set({
          Q: value,
        })
        return
      }
      break
    case 'octaves':
      if (isnumber(value)) {
        phaser.set({
          octaves: value,
        })
        return
      }
      break
    case 'basefrequency':
      phaser.set({
        baseFrequency: value,
      })
      return
  }
  api_error(SOFTWARE, `kind`, `unknown phaser ${config} or ${value}`)
}
