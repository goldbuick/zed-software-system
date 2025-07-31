import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

import { AUDIO_SYNTH } from '.'

export function synthvoicefxautowahconfig(
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
    api_error(SOFTWARE, player, `synth`, `index ${index} out of bounds`)
    return
  }
  const autowah = synth.FXCHAIN.autowah
  switch (config) {
    case 'basefrequency':
      if (isnumber(value)) {
        autowah.set({
          baseFrequency: value,
        })
        return
      }
      break
    case 'octaves':
      if (isnumber(value)) {
        autowah.set({
          octaves: value,
        })
        return
      }
      break
    case 'sensitivity':
      if (isnumber(value)) {
        autowah.set({
          sensitivity: value,
        })
        return
      }
      break
    case 'gain':
      if (isnumber(value)) {
        autowah.set({
          gain: value,
        })
        return
      }
      break
    case 'follower':
      if (isnumber(value)) {
        autowah.set({
          follower: value,
        })
        return
      }
      break
  }

  api_error(
    SOFTWARE,
    player,
    `synth`,
    `unknown autowah config ${config} with ${value}`,
  )
}
