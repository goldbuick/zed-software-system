import { Channel } from 'tone'
import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { AUDIO_SYNTH } from 'zss/feature/synth'
import { volumetodb } from 'zss/feature/synth/fx'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

import { synthvoicefxautofilterconfig } from './autofilter'
import { synthvoicefxautowahconfig } from './autowah'
import { synthvoicefxdistortionconfig } from './distort'
import { synthvoicefxechoconfig } from './echo'
import { synthvoicefxfcrushconfig } from './fcrush'
import { synthvoicefxreverbconfig } from './reverb'
import { synthvoicefxvibratoconfig } from './vibrato'

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
        switch (fxname) {
          case 'vibrato':
          case 'autofilter':
            fx.volume.value = volumetodb(50)
            break
          default:
            fx.volume.value = volumetodb(18)
            break
        }
        break
      case 'off':
        fx.volume.value = volumetodb(0)
        break
      default:
        if (isnumber(config)) {
          fx.volume.value = volumetodb(config)
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
  apierror(SOFTWARE, player, `synth`, `unknown fx ${fxname as string}`)
}
