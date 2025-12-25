import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

import { AUDIO_SYNTH } from '.'

export function synthvoicefxautofilterconfig(
  player: string,
  synth: MAYBE<AUDIO_SYNTH>,
  index: number,
  config: number | string,
  value: number | string,
) {
  if (!ispresent(synth) || index < 0 || index >= synth.FX.length) {
    apierror(SOFTWARE, player, `synth`, `index ${index} out of bounds`)
    return
  }
  const autofilter = synth.FXCHAIN.autofilter
  switch (config) {
    case 'depth':
      if (isnumber(value)) {
        autofilter.set({ depth: value })
        return
      }
      break
    case 'frequency':
      if (isnumber(value)) {
        autofilter.set({ frequency: value })
        return
      }
      break
    case 'octaves':
      if (isnumber(value)) {
        autofilter.set({ octaves: value })
        return
      }
      break
  }
  apierror(SOFTWARE, player, `kind`, `unknown autofilter ${config} or ${value}`)
}
