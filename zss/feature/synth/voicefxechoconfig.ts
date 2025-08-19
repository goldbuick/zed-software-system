import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

import { AUDIO_SYNTH } from '.'

export function synthvoicefxechoconfig(
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
  const echo = synth.FXCHAIN.echo
  switch (config) {
    case 'delaytime':
      if (isnumber(value)) {
        echo.set({ delayTime: value })
        return
      }
      break
    case 'feedback':
      if (isnumber(value)) {
        echo.set({ feedback: value })
        return
      }
      break
  }
  api_error(SOFTWARE, player, `kind`, `unknown echo ${config} or ${value}`)
}
