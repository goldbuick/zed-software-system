import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { isnumber, ispresent, MAYBE } from 'zss/mapping/types'

import { AUDIO_SYNTH } from './synth'

export function synthvoicefxfcrushconfig(
  synth: MAYBE<AUDIO_SYNTH>,
  index: number,
  config: number | string,
  value: number | string,
) {
  if (!ispresent(synth) || index < 0 || index >= synth.FX.length) {
    api_error(SOFTWARE, `synth`, `index ${index} out of bounds`)
    return
  }
  const fcrush = synth.FX[index].fcrush
  switch (config) {
    case 'rate':
      if (isnumber(value)) {
        fcrush.set({
          rate: value,
        })
        return
      }
      break
  }
  api_error(SOFTWARE, `kind`, `unknown fcrush ${config} or ${value}`)
}
