import { api_error } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  isarray,
  isnumber,
  ispresent,
  isstring,
  MAYBE,
} from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { AUDIO_SYNTH } from './synth'
import { SOURCE_TYPE } from './synthsource'

const SYNTH_VARIANT_PARTIALS =
  /(am|fm|fat)*(sine|square|triangle|sawtooth|custom)[0-9]+/

const SYNTH_VARIANTS =
  /(am|fm|fat)*(sine|square|triangle|sawtooth|custom)[0-9]*/

function validatesynthtype(
  value: string,
  maybepartials: string | number | number[],
) {
  if (isstring(value)) {
    const type = NAME(value)
    const haspartials = SYNTH_VARIANT_PARTIALS.test(type)

    // validate partials
    if (haspartials) {
      return isarray(maybepartials)
    }

    switch (type) {
      case 'pwm':
      case 'pulse':
      case 'retro':
      case 'buzz':
      case 'clang':
      case 'metallic':
      case 'bells':
        return true
      default:
        return SYNTH_VARIANTS.test(type)
    }
  }

  // failed
  return false
}

export function synthvoiceconfig(
  player: string,
  synth: MAYBE<AUDIO_SYNTH>,
  index: number,
  config: number | string,
  value: number | string | number[],
) {
  if (!ispresent(synth)) {
    return
  }

  // validate index
  const voice = synth.SOURCE[index]
  if (!ispresent(voice)) {
    api_error(SOFTWARE, player, `synth`, `unknown voice ${index}`)
    return
  }

  switch (config) {
    case 'reset':
    case 'restart':
      voice.applyreset()
      return
    case 'vol':
    case 'volume':
      if (isnumber(value)) {
        voice.source.synth.volume.value = value
      }
      return
    case 'port':
    case 'portamento':
      if (isnumber(value)) {
        switch (voice.source.type) {
          case SOURCE_TYPE.SYNTH:
            voice.source.synth.portamento = value
            break
          case SOURCE_TYPE.RETRO_NOISE:
            api_error(
              SOFTWARE,
              player,
              `synth`,
              `portamento for retro synth not supported`,
            )
            break
        }
      }
      return
    case 'env':
    case 'envelope':
      if (isarray(value)) {
        const [attack, decay, sustain, release] = value
        voice.source.synth.set({
          envelope: {
            attack,
            decay,
            sustain,
            release,
          },
        })
      }
      return
    default:
      if (isstring(config)) {
        // change oscillator type
        if (validatesynthtype(config, value)) {
          switch (config) {
            case 'retro':
              synth.changesource(index, SOURCE_TYPE.RETRO_NOISE)
              break
            case 'buzz':
              synth.changesource(index, SOURCE_TYPE.BUZZ_NOISE)
              break
            case 'clang':
              synth.changesource(index, SOURCE_TYPE.CLANG_NOISE)
              break
            case 'metallic':
              synth.changesource(index, SOURCE_TYPE.METALLIC_NOISE)
              break
            case 'bells':
              synth.changesource(index, SOURCE_TYPE.BELLS)
              break
            default:
              synth.changesource(index, SOURCE_TYPE.SYNTH)
              voice.source.synth.set({
                oscillator: {
                  // @ts-expect-error should be type
                  type: config,
                },
              })
              if (isarray(value)) {
                voice.source.synth.set({
                  oscillator: {
                    // @ts-expect-error should be type
                    type: config,
                    partials: value,
                    partialCount: value.length,
                  },
                })
              }
              if (isnumber(value)) {
                voice.source.synth.set({
                  oscillator: {
                    // @ts-expect-error should be type
                    type: config,
                    partials: [value],
                    partialCount: 1,
                  },
                })
              }
              break
          }
          return
        }

        switch (voice.source.type) {
          case SOURCE_TYPE.SYNTH: {
            //change oscillator config
            const kind = voice.source.synth.get().oscillator.type
            switch (kind) {
              case 'pwm':
                switch (config) {
                  case 'modfreq':
                  case 'modulationfrequency':
                    if (isnumber(value)) {
                      voice.source.synth.set({
                        oscillator: {
                          modulationFrequency: value,
                        },
                      })
                    }
                    return
                }
                break
              case 'pulse':
                switch (config) {
                  case 'width':
                    if (isnumber(value)) {
                      voice.source.synth.set({
                        oscillator: { width: value },
                      })
                    }
                    return
                }
                break
              case 'custom':
              case 'sine':
              case 'square':
              case 'triangle':
              case 'sawtooth':
                switch (config) {
                  case 'phase':
                    if (isnumber(value)) {
                      voice.source.synth.set({
                        oscillator: { phase: value },
                      })
                    }
                    return
                }
                break
              case 'amcustom':
              case 'amsine':
              case 'amsquare':
              case 'amtriangle':
              case 'amsawtooth':
                switch (config) {
                  case 'harmonicity':
                    if (isnumber(value)) {
                      voice.source.synth.set({
                        oscillator: { harmonicity: value },
                      })
                    }
                    return
                  case 'modtype':
                  case 'modulationtype':
                    if (isstring(value)) {
                      voice.source.synth.set({
                        oscillator: {
                          // @ts-expect-error yes
                          modulationType: value,
                        },
                      })
                    }
                    return
                  case 'modenv':
                  case 'modulationenvelope':
                    if (isarray(value)) {
                      const [attack, decay, sustain, release] = value
                      voice.source.synth.set({
                        oscillator: {
                          // @ts-expect-error yes
                          modulationEnvelope: {
                            attack,
                            decay,
                            sustain,
                            release,
                          },
                        },
                      })
                      return
                    }
                    break
                }
                break
              case 'fmcustom':
              case 'fmsine':
              case 'fmsquare':
              case 'fmtriangle':
              case 'fmsawtooth':
                switch (config) {
                  case 'harmonicity':
                    if (isnumber(value)) {
                      voice.source.synth.set({
                        oscillator: {
                          harmonicity: value,
                        },
                      })
                      return
                    }
                    break
                  case 'modindex':
                    if (isnumber(value)) {
                      voice.source.synth.set({
                        oscillator: {
                          modulationIndex: value,
                        },
                      })
                      return
                    }
                    break
                  case 'modtype':
                    if (isstring(value)) {
                      voice.source.synth.set({
                        oscillator: {
                          // @ts-expect-error yes
                          modulationType: value,
                        },
                      })
                      return
                    }
                    break
                  case 'modenv':
                    if (isarray(value)) {
                      const [attack, decay, sustain, release] = value
                      voice.source.synth.set({
                        oscillator: {
                          // @ts-expect-error yes
                          modulationEnvelope: {
                            attack,
                            decay,
                            sustain,
                            release,
                          },
                        },
                      })
                      return
                    }
                    break
                }
                break
              case 'fatcustom':
              case 'fatsine':
              case 'fatsquare':
              case 'fattriangle':
              case 'fatsawtooth':
                switch (config) {
                  case 'count':
                    if (isnumber(value)) {
                      voice.source.synth.set({
                        oscillator: {
                          count: value,
                        },
                      })
                      return
                    }
                    break
                  case 'phase':
                    if (isnumber(value)) {
                      voice.source.synth.set({
                        oscillator: {
                          phase: value,
                        },
                      })
                      return
                    }
                    break
                  case 'spread':
                    if (isnumber(value)) {
                      voice.source.synth.set({
                        oscillator: {
                          spread: value,
                        },
                      })
                      return
                    }
                    break
                }
                break
            }
            return
          }
          case SOURCE_TYPE.BELLS: {
            switch (config) {
              default:
                // todo add config settings
                return
            }
            break
          }
        }

        api_error(SOFTWARE, player, `synth`, `unknown config ${config}`)
      }
      break
  }
}
