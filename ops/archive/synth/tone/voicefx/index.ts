import { Channel } from 'tone'
import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { AUDIO_SYNTH } from 'ops/archive/synth/tone'
/** Archived Tone chain volume helper (was `zss/feature/synth/fx.ts`). */
function volumetodb(value: number) {
  return 20 * Math.log10(value) - 35
}
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'

import { canonicalvoicefxgroupindex } from 'ops/archive/synth/tone/voicefxgroup'

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
  const groupidx = canonicalvoicefxgroupindex(index)
  if (groupidx < 0 || groupidx >= synth.FX.length) {
    apierror(SOFTWARE, player, `synth`, `index ${index} out of bounds`)
    return
  }
  const fx = synth.FX[groupidx][fxname] as Channel
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
              synthvoicefxfcrushconfig(player, synth, groupidx, config, value)
              break
            case 'echo':
              synthvoicefxechoconfig(player, synth, groupidx, config, value)
              break
            case 'autofilter':
              synthvoicefxautofilterconfig(
                player,
                synth,
                groupidx,
                config,
                value,
              )
              break
            case 'reverb':
              synthvoicefxreverbconfig(player, synth, groupidx, config, value)
              break
            case 'distort':
            case 'distortion':
              synthvoicefxdistortionconfig(
                player,
                synth,
                groupidx,
                config,
                value,
              )
              break
            case 'vibrato':
              synthvoicefxvibratoconfig(player, synth, groupidx, config, value)
              break
            case 'autowah':
              synthvoicefxautowahconfig(player, synth, groupidx, config, value)
              break
          }
        }
        break
    }
    return
  }
  apierror(SOFTWARE, player, `synth`, `unknown fx|${fxname as string}`)
}
