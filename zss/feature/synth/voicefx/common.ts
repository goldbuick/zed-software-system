import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { AUDIO_SYNTH } from 'zss/feature/synth'
import { MAYBE, ispresent } from 'zss/mapping/types'

export type VoiceFxConfigHandler = (
  fx: any,
  config: number | string,
  value: number | string,
) => boolean

/**
 * Shared wrapper for VoiceFX config handlers.
 * Handles guards (synth present, index in bounds), try/catch, and apierror.
 */
export function createvoicefxconfighandler(
  fxname: string,
  getFx: (synth: AUDIO_SYNTH) => any,
  handle: VoiceFxConfigHandler,
) {
  return (
    player: string,
    synth: MAYBE<AUDIO_SYNTH>,
    index: number,
    config: number | string,
    value: number | string,
  ) => {
    if (!ispresent(synth) || index < 0 || index >= synth.FX.length) {
      apierror(SOFTWARE, player, 'synth', `index ${index} out of bounds`)
      return
    }
    const fx = getFx(synth)
    try {
      if (!handle(fx, config, value)) {
        throw new Error(`unknown ${fxname}|${config}|${value}`)
      }
    } catch (err) {
      apierror(SOFTWARE, player, 'synth', err)
    }
  }
}
