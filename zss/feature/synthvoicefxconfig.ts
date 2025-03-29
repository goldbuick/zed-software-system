import { Distortion, FeedbackDelay, Phaser, Reverb } from 'tone'
import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { clamp } from 'zss/mapping/number'
import { isnumber, ispresent, MAYBE } from 'zss/mapping/types'

import { AUDIO_SYNTH } from './synth'
import { ECHO_OFF, ECHO_ON } from './synthfx'

export function synthvoicefxconfig(
  synth: MAYBE<AUDIO_SYNTH>,
  synthindex: number,
  fxname: string,
  config: number | string,
  value: number | string,
) {
  if (!ispresent(synth)) {
    return
  }

  const index = synth.mapindextofx(synthindex)
  // @ts-expect-error bah
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
            case 'vibrato': {
              switch (config) {
                default:
                  api_error(
                    SOFTWARE,
                    `synth`,
                    `unknown ${fxname} config ${config}`,
                  )
                  break
              }
              break
            }
            case 'chorus': {
              switch (config) {
                default:
                  api_error(
                    SOFTWARE,
                    `synth`,
                    `unknown ${fxname} config ${config}`,
                  )
                  break
              }
              break
            }
            case 'phaser': {
              const phaser = fx as Phaser
              switch (config) {
                case 'q':
                  if (isnumber(value)) {
                    phaser.Q.value = value
                  }
                  break
                case 'octaves':
                  if (isnumber(value)) {
                    phaser.octaves = value
                  }
                  break
                case 'basefrequency':
                  if (isnumber(value)) {
                    phaser.baseFrequency = value
                  }
                  break
                default:
                  api_error(
                    SOFTWARE,
                    `synth`,
                    `unknown ${fxname} config ${config}`,
                  )
                  break
              }
              break
            }
            case 'distortion': {
              const distortion = fx as Distortion
              switch (config) {
                case 'distortion':
                  if (isnumber(value)) {
                    distortion.distortion = value
                  }
                  break
                case 'oversample':
                  switch (value) {
                    case '2x':
                    case '4x':
                    case 'none':
                      distortion.oversample = value
                      break
                  }
                  break
                default:
                  api_error(
                    SOFTWARE,
                    `kind`,
                    `unknown ${fxname} config ${config}`,
                  )
                  break
              }
              break
            }
            case 'echo': {
              const echo = fx as FeedbackDelay
              switch (config) {
                case 'delaytime':
                  echo.delayTime.value = value
                  break
                default:
                  api_error(
                    SOFTWARE,
                    `kind`,
                    `unknown ${fxname} config ${config}`,
                  )
                  break
              }
              break
            }
            case 'reverb': {
              const reverb = fx as Reverb
              switch (config) {
                case 'decay':
                  reverb.decay = value
                  break
                case 'predelay':
                  reverb.preDelay = value
                  break
                default:
                  api_error(
                    SOFTWARE,
                    `kind`,
                    `unknown ${fxname} config ${config}`,
                  )
                  break
              }
              break
            }
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
