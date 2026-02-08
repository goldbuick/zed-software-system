import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

import { AUDIO_SYNTH } from '..'

export function synthvoicefxfcrushconfig(
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
  const fcrush = synth.FXCHAIN.fcrush
  switch (config) {
    case 'rate':
      if (isnumber(value)) {
        fcrush.set({ rate: value })
        return
      }
      break
  }
  apierror(SOFTWARE, player, `kind`, `unknown fcrush ${config} or ${value}`)
}
