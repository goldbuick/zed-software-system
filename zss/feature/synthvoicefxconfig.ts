import { FeedbackDelay } from 'tone'
import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { clamp } from 'zss/mapping/number'
import { isnumber, ispresent, MAYBE } from 'zss/mapping/types'

import { AUDIO_SYNTH } from './synth'
import { ECHO_OFF, ECHO_ON } from './synthfx'
import { synthvoicefxdistortionconfig } from './synthvoicefxdistortconfig'
import { synthvoicefxechoconfig } from './synthvoicefxechoconfig'
import { synthvoicefxfcrushconfig } from './synthvoicefxfcrushconfig'
import { synthvoicefxphaserconfig } from './synthvoicefxphaserconfig'
import { synthvoicefxreverbconfig } from './synthvoicefxreverbconfig'
import { synthvoicefxvibratoconfig } from './synthvoicefxvibratoconfig'

type FXSET = AUDIO_SYNTH['FX'][number]
type JUSTFXSET = Omit<FXSET, 'applyreset'>
export type FXNAME = keyof JUSTFXSET

export function synthvoicefxconfig(
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
    api_error(SOFTWARE, `synth`, `index ${index} out of bounds`)
    return
  }
  const fx = synth.FX[index][fxname]
  if (ispresent(fx)) {
    switch (config) {
      case 'on':
        // default on value
        fx.wet.value = 0.2
        break
      case 'off':
        fx.wet.value = 0.0
        break
      default:
        if (isnumber(config)) {
          // specify wet in terms of percent
          fx.wet.value = clamp(0.01 * config, 0, 1)
        } else {
          switch (fxname) {
            case 'fc':
            case 'fcrush':
              synthvoicefxfcrushconfig(synth, index, config, value)
              break
            case 'echo':
              synthvoicefxechoconfig(synth, index, config, value)
              break
            case 'phaser':
              synthvoicefxphaserconfig(synth, index, config, value)
              break
            case 'reverb':
              synthvoicefxreverbconfig(synth, index, config, value)
              break
            case 'distort':
            case 'distortion':
              synthvoicefxdistortionconfig(synth, index, config, value)
              break
            case 'vibrato':
              synthvoicefxvibratoconfig(synth, index, config, value)
              break
          }
        }
        break
    }
    // edge case for echo
    if (fx instanceof FeedbackDelay) {
      if (fx.wet.value === 0) {
        fx.set({ delayTime: ECHO_OFF })
      } else if (fx.get().delayTime === ECHO_OFF) {
        fx.set({ delayTime: ECHO_ON })
      }
    }
    return
  }
  api_error(SOFTWARE, `synth`, `unknown fx ${fxname}`)
}
