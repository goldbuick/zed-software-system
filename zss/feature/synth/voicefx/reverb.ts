import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { AUDIO_SYNTH } from 'zss/feature/synth'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

export function synthvoicefxreverbconfig(
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
  const reverb = synth.FXCHAIN.reverb
  try {
    switch (config) {
      case 'decay':
        if (isnumber(value)) {
          reverb.set({ decay: value })
          return
        }
        break
      case 'predelay':
        if (isnumber(value)) {
          reverb.set({ preDelay: value })
          return
        }
        break
    }
    throw new Error(`unknown reverb|${config}|${value}`)
  } catch (err) {
    apierror(SOFTWARE, player, 'synth', err)
  }
}
