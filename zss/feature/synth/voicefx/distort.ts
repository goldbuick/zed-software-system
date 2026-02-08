import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { AUDIO_SYNTH } from 'zss/feature/synth'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'

export function synthvoicefxdistortionconfig(
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
  const distortion = synth.FXCHAIN.distortion
  switch (config) {
    case 'distortion':
      if (isnumber(value)) {
        distortion.set({ distortion: value })
        return
      }
      break
    case 'oversample':
      if (isstring(value)) {
        distortion.set({ oversample: value as OverSampleType })
        return
      }
      break
  }
  apierror(SOFTWARE, player, `kind`, `unknown distortion ${config} or ${value}`)
}
