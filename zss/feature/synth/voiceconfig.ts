import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  MAYBE,
  isarray,
  isnumber,
  ispresent,
  isstring,
} from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { SOURCE_TYPE } from './source'

import { AUDIO_SYNTH } from '.'

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
      case 'doot':
      case 'algo0':
      case 'algo1':
      case 'algo2':
      case 'algo3':
      case 'algo4':
      case 'algo5':
      case 'algo6':
      case 'algo7':
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
    apierror(SOFTWARE, player, `synth`, `unknown voice ${index}`)
    return
  }

  switch (config) {
    case 'restart': {
      synth.applyreset()
      return
    }
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
            apierror(
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
              synth.changesource(index, SOURCE_TYPE.RETRO_NOISE, 0)
              break
            case 'buzz':
              synth.changesource(index, SOURCE_TYPE.BUZZ_NOISE, 0)
              break
            case 'clang':
              synth.changesource(index, SOURCE_TYPE.CLANG_NOISE, 0)
              break
            case 'metallic':
              synth.changesource(index, SOURCE_TYPE.METALLIC_NOISE, 0)
              break
            case 'bells':
              synth.changesource(index, SOURCE_TYPE.BELLS, 0)
              break
            case 'doot':
              synth.changesource(index, SOURCE_TYPE.DOOT, 0)
              break
            case 'algo0':
              synth.changesource(index, SOURCE_TYPE.ALGO_SYNTH, 0)
              break
            case 'algo1':
              synth.changesource(index, SOURCE_TYPE.ALGO_SYNTH, 1)
              break
            case 'algo2':
              synth.changesource(index, SOURCE_TYPE.ALGO_SYNTH, 2)
              break
            case 'algo3':
              synth.changesource(index, SOURCE_TYPE.ALGO_SYNTH, 3)
              break
            case 'algo4':
              synth.changesource(index, SOURCE_TYPE.ALGO_SYNTH, 4)
              break
            case 'algo5':
              synth.changesource(index, SOURCE_TYPE.ALGO_SYNTH, 5)
              break
            case 'algo6':
              synth.changesource(index, SOURCE_TYPE.ALGO_SYNTH, 6)
              break
            case 'algo7':
              synth.changesource(index, SOURCE_TYPE.ALGO_SYNTH, 7)
              break
            default:
              synth.changesource(index, SOURCE_TYPE.SYNTH, 0)
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
          case SOURCE_TYPE.ALGO_SYNTH: {
            switch (config) {
              case 'harmonicity':
                if (isnumber(value)) {
                  voice.source.synth.set({
                    harmonicity: value,
                  })
                  return
                }
                break
              case 'modindex':
                if (isnumber(value)) {
                  voice.source.synth.set({
                    modulationindex1: value,
                    modulationindex2: value,
                    modulationindex3: value,
                  })
                  return
                }
                break
              case 'modindex1':
                if (isnumber(value)) {
                  voice.source.synth.set({
                    modulationindex1: value,
                  })
                  return
                }
                break
              case 'modindex2':
                if (isnumber(value)) {
                  voice.source.synth.set({
                    modulationindex2: value,
                  })
                  return
                }
                break
              case 'modindex3':
                if (isnumber(value)) {
                  voice.source.synth.set({
                    modulationindex3: value,
                  })
                  return
                }
                break
              case 'osc1':
                if (isstring(value)) {
                  voice.source.synth.set({
                    oscillator1: {
                      // @ts-expect-error should be type
                      type: value,
                    },
                  })
                  return
                }
                break
              case 'osc2':
                if (isstring(value)) {
                  voice.source.synth.set({
                    oscillator2: {
                      // @ts-expect-error should be type
                      type: value,
                    },
                  })
                  return
                }
                break
              case 'osc3':
                if (isstring(value)) {
                  voice.source.synth.set({
                    oscillator3: {
                      // @ts-expect-error should be type
                      type: value,
                    },
                  })
                  return
                }
                break
              case 'osc4':
                if (isstring(value)) {
                  voice.source.synth.set({
                    oscillator4: {
                      // @ts-expect-error should be type
                      type: value,
                    },
                  })
                  return
                }
                break
              case 'env1':
              case 'envelope1':
                if (isarray(value)) {
                  const [attack, decay, sustain, release] = value
                  voice.source.synth.set({
                    envelope1: {
                      attack,
                      decay,
                      sustain,
                      release,
                    },
                  })
                  return
                }
                break
              case 'env2':
              case 'envelope2':
                if (isarray(value)) {
                  const [attack, decay, sustain, release] = value
                  voice.source.synth.set({
                    envelope2: {
                      attack,
                      decay,
                      sustain,
                      release,
                    },
                  })
                  return
                }
                break
              case 'env3':
              case 'envelope3':
                if (isarray(value)) {
                  const [attack, decay, sustain, release] = value
                  voice.source.synth.set({
                    envelope3: {
                      attack,
                      decay,
                      sustain,
                      release,
                    },
                  })
                  return
                }
                break
              case 'env4':
              case 'envelope4':
                if (isarray(value)) {
                  const [attack, decay, sustain, release] = value
                  voice.source.synth.set({
                    envelope4: {
                      attack,
                      decay,
                      sustain,
                      release,
                    },
                  })
                  return
                }
                break
            }
            return
          }
        }

        apierror(SOFTWARE, player, `synth`, `unknown config ${config}`)
      }
      break
  }
}
