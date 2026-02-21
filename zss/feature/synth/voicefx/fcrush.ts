import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { AUDIO_SYNTH } from 'zss/feature/synth'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

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
  try {
    switch (config) {
      case 'rate':
        if (isnumber(value)) {
          fcrush.set({ rate: value })
          return
        }
        break
    }
    throw new Error(`unknown fcrush|${config}|${value}`)
  } catch (err) {
    apierror(SOFTWARE, player, 'synth', err)
  }
}
