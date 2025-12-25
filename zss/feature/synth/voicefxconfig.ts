import { Channel } from 'tone'
import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

import { volumetodb } from './fx'
import { synthvoicefxautofilterconfig } from './voicefxautofilterconfig'
import { synthvoicefxautowahconfig } from './voicefxautowah'
import { synthvoicefxdistortionconfig } from './voicefxdistortconfig'
import { synthvoicefxechoconfig } from './voicefxechoconfig'
import { synthvoicefxfcrushconfig } from './voicefxfcrushconfig'
import { synthvoicefxreverbconfig } from './voicefxreverbconfig'
import { synthvoicefxvibratoconfig } from './voicefxvibratoconfig'

import { AUDIO_SYNTH } from '.'

type FXSET = AUDIO_SYNTH['FX'][number]
type JUSTFXSET = Omit<FXSET, 'applyreset'>
export type FXNAME = keyof JUSTFXSET

export function synthvoicefxconfig(
  player: string,
  synth: MAYBE<AUDIO_SYNTH>,
  index: number,
  fxname: FXNAME,
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
  const fx = synth.FX[index][fxname] as Channel
  if (ispresent(fx)) {
    switch (config) {
      case 'on':
        // default on value(s)
        switch (fxname) {
          case 'vibrato':
          case 'autofilter':
            fx.volume.value = volumetodb(80)
            break
          default:
            fx.volume.value = volumetodb(30)
            break
        }
        break
      case 'off':
        fx.volume.value = volumetodb(0)
        break
      default:
        if (isnumber(config)) {
          // specify wet in terms of percent
          fx.volume.value = volumetodb(config)
          // fx.wet.value = clamp(0.01 * config, 0, 1)
        } else {
          switch (fxname) {
            case 'fc':
            case 'fcrush':
              synthvoicefxfcrushconfig(player, synth, index, config, value)
              break
            case 'echo':
              synthvoicefxechoconfig(player, synth, index, config, value)
              break
            case 'autofilter':
              synthvoicefxautofilterconfig(player, synth, index, config, value)
              break
            case 'reverb':
              synthvoicefxreverbconfig(player, synth, index, config, value)
              break
            case 'distort':
            case 'distortion':
              synthvoicefxdistortionconfig(player, synth, index, config, value)
              break
            case 'vibrato':
              synthvoicefxvibratoconfig(player, synth, index, config, value)
              break
            case 'autowah':
              synthvoicefxautowahconfig(player, synth, index, config, value)
              break
          }
        }
        break
    }
    return
  }
  apierror(SOFTWARE, player, `synth`, `unknown fx ${fxname}`)
}
