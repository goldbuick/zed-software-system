import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { AUDIO_SYNTH } from 'zss/feature/synth'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

export function synthvoicefxvibratoconfig(
  player: string,
  synth: MAYBE<AUDIO_SYNTH>,
  index: number,
  config: number | string,
  value: number | string,
) {
  if (!ispresent(synth)) {
    return
  }
  if (index < 0 || index >= synth.FX.length) {
    apierror(SOFTWARE, player, `synth`, `index ${index} out of bounds`)
    return
  }
  const vibrato = synth.FXCHAIN.vibrato
  switch (config) {
    case 'maxdelay':
      if (isnumber(value)) {
        vibrato.set({ maxDelay: value })
        return
      }
      break
  }
  apierror(
    SOFTWARE,
    player,
    `synth`,
    `unknown vibrato config ${config} with ${value}`,
  )
}
