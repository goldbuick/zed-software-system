import { EdgeSpeechTTS } from '@lobehub/tts'
import {
  Compressor,
  Distortion,
  Filter,
  Frequency,
  Gain,
  getTransport,
  MembraneSynth,
  FeedbackDelay,
  NoiseSynth,
  PolySynth,
  start,
  Synth,
  Time,
  EQ3,
  Reverb,
  Part,
  Phaser,
  Volume,
  getDestination,
  Player,
} from 'tone'
import { createdevice } from 'zss/device'
import { ECHO_OFF, ECHO_ON } from 'zss/gadget/audio/fx'
import {
  invokeplay,
  parseplay,
  SYNTH_INVOKE,
  SYNTH_NOTE_ON,
} from 'zss/gadget/audio/play'
import { createsource } from 'zss/gadget/audio/source'
import { doasync } from 'zss/mapping/func'
import { clamp } from 'zss/mapping/number'
import { isarray, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { api_error, tape_info } from './api'

// synth setup

let enabled = false
export function enableaudio() {
  if (enabled) {
    return
  }
  start()
    .then(() => {
      if (!enabled) {
        const transport = getTransport()
        transport.bpm.value = 107
        transport.start()
        tape_info('synth', 'audio is enabled!')
        enabled = true
      }
    })
    .catch(() => {})
}

function createsynth() {
  const destination = getDestination()

  const mainvolume = new Volume(8)
  mainvolume.connect(destination)

  const maincompressor = new Compressor({
    threshold: -24,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
    knee: 30,
  })
  maincompressor.connect(mainvolume)

  const maingain = new Gain()
  maingain.connect(maincompressor)

  const drumvolume = new Volume(2)
  drumvolume.connect(maincompressor)

  const SOURCE = [
    // for sfx
    createsource(maingain),
    // + 8track synths
    createsource(maingain),
    createsource(maingain),
    createsource(maingain),
    createsource(maingain),
    createsource(maingain),
    createsource(maingain),
    createsource(maingain),
    createsource(maingain),
  ]

  // config drums

  // drumtick

  const drumtick = new PolySynth().connect(drumvolume)
  drumtick.maxPolyphony = 8
  drumtick.set({
    envelope: {
      attack: 0.001,
      decay: 0.001,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: {
      type: 'square',
    },
  })

  function drumticktrigger(time: number) {
    drumtick.triggerAttackRelease('C6', '1i', time)
  }

  // drumtweet

  const drumtweet = new Synth().connect(drumvolume)
  drumtick.set({
    envelope: {
      attack: 0.001,
      decay: 0.001,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: {
      type: 'square',
    },
  })

  function drumtweettrigger(time: number) {
    const ramp = Time('64n').toSeconds()
    drumtweet.triggerAttackRelease('C6', '8n', time)
    drumtweet.frequency.exponentialRampToValueAtTime('C11', ramp + time)
  }

  // drumcowbell

  const drumcowbellfilter = new Filter(350, 'bandpass').connect(drumvolume)

  const drumcowbellgain = new Gain().connect(drumcowbellfilter)
  drumcowbellgain.gain.value = 0

  const drumcowbell = new PolySynth().connect(drumcowbellgain)
  drumcowbell.maxPolyphony = 8
  drumcowbell.set({
    envelope: {
      attack: 0.001,
      decay: 0.01,
      sustain: 0.1,
      release: 0.1,
    },
    oscillator: {
      type: 'square',
    },
  })

  function drumcowbelltrigger(duration: string, time: number) {
    const ramp = Time('64n').toSeconds() + Time(duration).toSeconds()
    drumcowbellgain.gain.setValueAtTime(0.5, time)
    drumcowbellgain.gain.exponentialRampToValueAtTime(0.01, ramp + time)
    drumcowbell.triggerAttackRelease([800, 540], duration, time)
  }

  // drumclap

  const drumclapeq = new EQ3(-10, 10, -1).connect(drumvolume)

  const drumclapfilter = new Filter(800, 'highpass', -12)
  drumclapfilter.connect(drumclapeq)

  const drumclap = new NoiseSynth()
  drumclap.set({
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.1,
      release: 0.1,
    },
  })
  drumclap.connect(drumclapfilter)

  function drumclaptrigger(duration: string, time: number) {
    drumclap.triggerAttackRelease(duration, time)
  }

  // drumhisnare

  const drumhisnaredistortion = new Distortion().connect(drumvolume)
  drumhisnaredistortion.set({
    distortion: 0.666,
  })

  const drumhisnareosc = new Synth()
  drumhisnareosc.set({
    envelope: {
      attack: 0,
      decay: 0.1,
      sustain: 0,
      release: 1,
    },
    oscillator: {
      type: 'triangle',
    },
  })
  drumhisnareosc.connect(drumhisnaredistortion)

  const drumhisnarefilter = new Filter()
  drumhisnarefilter.set({
    type: 'highpass',
    frequency: 10000,
  })
  drumhisnarefilter.connect(drumhisnaredistortion)

  const drumhisnarenoise = new NoiseSynth()
  drumhisnarenoise.set({
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0,
      release: 0.1,
    },
  })
  drumhisnarenoise.connect(drumhisnarefilter)

  function drumhisnaretrigger(duration: string, time: number) {
    const ramp = Time('512n').toSeconds()
    const ramp2 = Time('32n').toSeconds()

    drumhisnareosc.triggerAttackRelease(10000, duration, time, 1)
    drumhisnareosc.frequency.exponentialRampToValueAtTime(300, time + ramp)
    drumhisnareosc.frequency.exponentialRampToValueAtTime(100, time + ramp2)

    drumhisnarenoise.triggerAttackRelease('8n', time, 0.333)
    drumhisnarenoise.volume.setValueAtTime(1, time)
    drumhisnarenoise.volume.exponentialRampToValueAtTime(
      0,
      time + Time('32n').toSeconds(),
    )
  }

  // drumhiwoodblock

  const drumhiwoodblockfilter = new Filter()
  drumhiwoodblockfilter.set({
    type: 'bandpass',
    frequency: 256,
    Q: 0.17,
  })
  drumhiwoodblockfilter.connect(drumvolume)

  const drumhiwoodblockclack = new Synth()
  drumhiwoodblockclack.set({
    envelope: {
      attack: 0.001,
      decay: 0.001,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: {
      type: 'sawtooth',
    },
  })
  drumhiwoodblockclack.connect(drumhiwoodblockfilter)

  const drumhiwoodblockdonk = new Synth()
  drumhiwoodblockdonk.set({
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: {
      type: 'sine',
    },
  })
  drumhiwoodblockdonk.connect(drumhiwoodblockfilter)

  function drumhiwoodblocktrigger(duration: string, time: number) {
    drumhiwoodblockclack.triggerAttackRelease(2000, duration, time)
    drumhiwoodblockclack.frequency.exponentialRampToValueAtTime(
      1000,
      time + Time('32n').toSeconds(),
    )
    drumhiwoodblockdonk.triggerAttackRelease(999, duration, time)
    drumhiwoodblockdonk.frequency.exponentialRampToValueAtTime(
      888,
      time + Time('256n').toSeconds(),
    )
  }

  // drumlowsnare

  const drumlowsnaredistortion = new Distortion().connect(drumvolume)
  drumlowsnaredistortion.set({
    distortion: 0.876,
  })

  const drumlowsnareosc = new Synth()
  drumlowsnareosc.set({
    envelope: {
      attack: 0,
      decay: 0.1,
      sustain: 0,
      release: 1,
    },
    oscillator: {
      type: 'triangle',
    },
  })
  drumlowsnareosc.connect(drumlowsnaredistortion)

  const drumlowsnarefilter = new Filter()
  drumlowsnarefilter.set({
    type: 'highpass',
    frequency: 10000,
  })
  drumlowsnarefilter.connect(drumlowsnaredistortion)

  const drumlowsnarenoise = new NoiseSynth()
  drumlowsnarenoise.set({
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.001,
      release: 0.1,
    },
  })
  drumlowsnarenoise.connect(drumlowsnarefilter)

  function drumlowsnaretrigger(duration: string, time: number) {
    const ramp = Time('512n').toSeconds()
    const ramp2 = Time('32n').toSeconds()

    drumlowsnareosc.triggerAttackRelease(10000, duration, time, 1)
    drumlowsnareosc.frequency.exponentialRampToValueAtTime(150, time + ramp)
    drumlowsnareosc.frequency.exponentialRampToValueAtTime(100, time + ramp2)

    drumlowsnarenoise.triggerAttackRelease('8n', time, 0.25)
    drumlowsnarenoise.volume.setValueAtTime(1, time)
    drumlowsnarenoise.volume.exponentialRampToValueAtTime(
      0,
      time + Time('32n').toSeconds(),
    )
  }

  // drumlowtom

  const drumlowtomosc = new Synth().connect(drumvolume)
  drumlowtomosc.set({
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: {
      type: 'sawtooth',
    },
  })

  const drumlowtomosc2 = new Synth().connect(drumvolume)
  drumlowtomosc.set({
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: {
      type: 'triangle',
    },
  })

  const drumlowtomnoise = new NoiseSynth().connect(drumvolume)
  drumlowtomnoise.set({
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.001,
      release: 0.1,
    },
  })

  function drumlowtomtrigger(duration: string, time: number) {
    const margin = Time('256n').toSeconds()
    const ramp = Time(duration).toSeconds() - margin

    drumlowtomosc.triggerAttackRelease('C4', ramp, time, 1)
    drumlowtomosc.frequency.exponentialRampToValueAtTime(
      Frequency('C0').toFrequency(),
      time + ramp,
    )

    drumlowtomosc2.triggerAttackRelease('C5', ramp, time, 0.5)
    drumlowtomosc2.frequency.exponentialRampToValueAtTime(
      Frequency('C0').toFrequency(),
      time + ramp,
    )

    const ramp2 = Time('4n').toSeconds()
    drumlowtomnoise.triggerAttackRelease('8n', time)
    drumlowtomnoise.volume.setValueAtTime(1, time)
    drumlowtomnoise.volume.exponentialRampToValueAtTime(0, time + ramp2)
  }

  // drumlowwoodblock

  const drumlowwoodblockfilter = new Filter()
  drumlowwoodblockfilter.set({
    type: 'bandpass',
    frequency: 256,
    Q: 0.17,
  })
  drumlowwoodblockfilter.connect(drumvolume)

  const drumlowwoodblockclack = new Synth()
  drumlowwoodblockclack.set({
    envelope: {
      attack: 0.001,
      decay: 0.001,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: {
      type: 'sawtooth',
    },
  })
  drumlowwoodblockclack.connect(drumlowwoodblockfilter)

  const drumlowwoodblockdonk = new Synth()
  drumlowwoodblockdonk.set({
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0.001,
      release: 0.1,
    },
    oscillator: {
      type: 'sine',
    },
  })
  drumlowwoodblockdonk.connect(drumlowwoodblockfilter)

  function drumlowwoodblocktrigger(duration: string, time: number) {
    drumlowwoodblockclack.triggerAttackRelease(2000, duration, time)
    drumlowwoodblockclack.frequency.exponentialRampToValueAtTime(
      100,
      time + Time('32n').toSeconds(),
    )
    drumlowwoodblockdonk.triggerAttackRelease(699, duration, time)
    drumlowwoodblockdonk.frequency.exponentialRampToValueAtTime(
      399,
      time + Time('256n').toSeconds(),
    )
  }

  // drumbass

  const drumbass = new MembraneSynth().connect(drumvolume)
  drumbass.set({
    octaves: 8,
  })

  function drumbasstrigger(time: number) {
    drumbass.triggerAttackRelease('C1', '8n', time)
  }

  // @ts-expect-error please ignore
  const pacer = new Part(synthtick)

  function synthtick(time: number, value: SYNTH_NOTE_ON | null) {
    if (value === null) {
      return
    }
    const [chan, duration, note] = value
    if (isstring(note) && ispresent(SOURCE[chan])) {
      SOURCE[chan].source.triggerAttackRelease(note, duration, time)
    }
    if (isnumber(note)) {
      switch (note) {
        case 0: // DRUM_TICK
          drumticktrigger(time)
          break
        case 1: // DRUM_TWEET
          drumtweettrigger(time)
          break
        case 2: // DRUM_COWBELL
          drumcowbelltrigger(duration, time)
          break
        case 3: // DRUM_CLAP
          drumclaptrigger(duration, time)
          break
        case 4: // DRUM_HI_SNARE
          drumhisnaretrigger(duration, time)
          break
        case 5: // DRUM_HI_WOODBLOCK
          drumhiwoodblocktrigger(duration, time)
          break
        case 6: // DRUM_LOW_SNARE
          drumlowsnaretrigger(duration, time)
          break
        case 7: // DRUM_LOW_TOM
          drumlowtomtrigger(duration, time)
          break
        case 8: // DRUM_LOW_WOODBLOCK
          drumlowwoodblocktrigger(duration, time)
          break
        case 9: // DRUM_BASS
          drumbasstrigger(time)
          break
        case -1: // END OF PATTERN
          // reset starting offset
          --pacercount
          if (pacercount === 0) {
            pacertime = -1
          }
          break
      }
    }
  }

  function synthplaystart(
    idx: number,
    starttime: number,
    invoke: SYNTH_INVOKE,
  ) {
    let endtime = starttime

    // build tone.js pattern
    const pattern = invokeplay(idx, starttime, invoke)

    // track endtime
    const last = pattern[pattern.length - 1]
    if (ispresent(last)) {
      endtime = Math.max(endtime, last[0])
    }

    // write pattern to pacer
    for (let p = 0; p < pattern.length; ++p) {
      const [time, value] = pattern[p]
      pacer.add(time, value)
    }

    return endtime
  }

  let pacertime = -1
  let pacercount = 0
  function addplay(mode: number, buffer: string) {
    // parse ops
    const invokes = parseplay(buffer)
    const seconds = getTransport().seconds

    if (mode) {
      // handle music

      // reset note offset
      if (pacertime === -1) {
        pacertime = seconds
      }

      // update count
      pacercount += invokes.length
      const starttime = pacertime
      for (let i = 0; i < invokes.length; ++i) {
        const endtime = synthplaystart(1 + i, starttime, invokes[i])
        pacertime = Math.max(pacertime, endtime)
      }
    } else {
      // handle sfx
      for (let i = 0; i < invokes.length; ++i) {
        synthplaystart(0, seconds, invokes[i])
      }
    }
  }

  // start it
  pacer.start(0)

  // stop playback
  function stopplay() {
    pacer.clear()
    pacertime = -1
    pacercount = 0
  }

  return { addplay, stopplay, SOURCE }
}

function validatesynthtype(
  value: string,
  maybepartials: string | number | number[],
) {
  if (isstring(value)) {
    const maybetype = NAME(value)
    let type = maybetype

    // validate partials
    if (isarray(maybepartials)) {
      return (
        type === 'custom' ||
        type === 'amcustom' ||
        type === 'fmcustom' ||
        type === 'fatcustom'
      )
    }
    switch (type) {
      case 'custom':
      case 'amcustom':
      case 'fmcustom':
      case 'fatcustom':
        if (!isarray(maybepartials)) {
          return false
        }
        break
    }

    // validate whole values only
    if (type === 'pwm' || type === 'pulse') {
      return true
    }

    // validate prefixes
    if (type.startsWith('am') || type.startsWith('fm')) {
      type = type.substring(2)
    }
    if (type.startsWith('fat')) {
      type = type.substring(3)
    }

    // validate waveform types
    if (type.startsWith('sine')) {
      type = type.substring(4)
    }
    if (type.startsWith('square')) {
      type = type.substring(6)
    }
    if (type.startsWith('triangle')) {
      type = type.substring(8)
    }
    if (type.startsWith('sawtooth')) {
      type = type.substring(8)
    }

    // no suffix numbers
    if (type === '') {
      return true
    }

    // validate suffix numbers
    const partial = parseInt(type, 10)
    if (isnumber(partial)) {
      return true
    }

    // failed
    return false
  }
}

// get MicrosoftSpeechTTS instance
const tts = new EdgeSpeechTTS({ locale: 'en-US' })

function playaudiobuffer(audiobuffer: AudioBuffer) {
  const player = new Player(audiobuffer).toDestination()
  player.start(0)
  console.info('playing audio buffer', player)
}

async function handletts(voice: string, phrase: string) {
  const audiobuffer = await tts.createAudio({
    input: phrase,
    options: { voice },
  })
  // play the audio
  playaudiobuffer(audiobuffer)
}

let synth: ReturnType<typeof createsynth>
const synthdevice = createdevice('synth', [], (message) => {
  if (enabled && !ispresent(synth)) {
    synth = createsynth()
  }
  if (!ispresent(synth)) {
    return
  }
  switch (message.target) {
    case 'tts':
      doasync('tts', async () => {
        if (isarray(message.data)) {
          const [voice, phrase] = message.data as [string, string]
          const withvoice = voice || 'en-US-GuyNeural'
          await handletts(withvoice, phrase)
        }
      })
      break
    case 'play':
      if (isarray(message.data)) {
        const [mode, buffer] = message.data as [number, string]
        if (buffer === '') {
          // stop playback
          synth.stopplay()
        } else {
          // add to playback
          synth.addplay(mode, buffer)
        }
      }
      break
    case 'voice':
      if (isarray(message.data)) {
        const [index, config, value] = message.data as [
          number,
          number | string,
          number | string | number[],
        ]

        // validate index
        const voice = synth.SOURCE[index]
        if (!ispresent(voice)) {
          api_error(
            synthdevice.name(),
            message.target,
            `unknown voice ${index}`,
          )
          return
        }

        switch (config) {
          case 'bpm':
            if (isnumber(value)) {
              getTransport().bpm.value = value
              return
            }
            break
          case 'vol':
          case 'volume':
            if (isnumber(value)) {
              voice.source.volume.value = value
              return
            }
            break
          case 'port':
          case 'portamento':
            if (isnumber(value)) {
              voice.source.portamento = value
              return
            }
            break
          case 'env':
          case 'envelope':
            if (isarray(value)) {
              const [attack, decay, sustain, release] = value
              voice.source.set({
                envelope: {
                  attack,
                  decay,
                  sustain,
                  release,
                },
              })
              return
            }
            break
          default:
            if (isstring(config)) {
              // change oscillator type
              if (validatesynthtype(config, value)) {
                voice.source.set({
                  // @ts-expect-error should be type
                  oscillator: { type: config },
                })
                if (isarray(value)) {
                  voice.source.set({
                    oscillator: { partials: value },
                  })
                }
                if (isnumber(value)) {
                  voice.source.set({
                    oscillator: { partials: [value] },
                  })
                }
                return
              }

              // change oscillator config
              const kind = voice.source.get().oscillator.type
              switch (kind) {
                case 'pwm':
                  switch (config) {
                    case 'modfreq':
                    case 'modulationfrequency':
                      if (isnumber(value)) {
                        voice.source.set({
                          oscillator: {
                            modulationFrequency: value,
                          },
                        })
                        return
                      }
                      break
                  }
                  break
                case 'pulse':
                  switch (config) {
                    case 'width':
                      if (isnumber(value)) {
                        voice.source.set({
                          oscillator: { width: value },
                        })
                        return
                      }
                      break
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
                        voice.source.set({
                          oscillator: { phase: value },
                        })
                        return
                      }
                      break
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
                        voice.source.set({
                          oscillator: { harmonicity: value },
                        })
                        return
                      }
                      break
                    case 'modtype':
                    case 'modulationtype':
                      if (isstring(value)) {
                        voice.source.set({
                          oscillator: {
                            // @ts-expect-error yes
                            modulationType: value,
                          },
                        })
                        return
                      }
                      break
                    case 'modenv':
                    case 'modulationenvelope':
                      if (isarray(value)) {
                        const [attack, decay, sustain, release] = value
                        voice.source.set({
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
                        voice.source.set({
                          oscillator: {
                            harmonicity: value,
                          },
                        })
                        return
                      }
                      break
                    case 'modindex':
                      if (isnumber(value)) {
                        voice.source.set({
                          oscillator: {
                            modulationIndex: value,
                          },
                        })
                        return
                      }
                      break
                    case 'modtype':
                      if (isstring(value)) {
                        voice.source.set({
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
                        voice.source.set({
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
                        voice.source.set({
                          oscillator: {
                            count: value,
                          },
                        })
                        return
                      }
                      break
                    case 'phase':
                      if (isnumber(value)) {
                        voice.source.set({
                          oscillator: {
                            phase: value,
                          },
                        })
                        return
                      }
                      break
                    case 'spread':
                      if (isnumber(value)) {
                        voice.source.set({
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
              api_error(
                synthdevice.name(),
                message.target,
                `unknown ${kind} config ${config}`,
              )
            }
            break
        }
      }
      break
    case 'voicefx':
      if (isarray(message.data)) {
        const [index, fxname, config, value] = message.data as [
          number,
          string,
          number | string,
          number | string,
        ]
        const voice = synth.SOURCE[index]
        const fx = voice?.fx[fxname as keyof typeof voice.fx]
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
                          synthdevice.name(),
                          message.target,
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
                          synthdevice.name(),
                          message.target,
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
                          synthdevice.name(),
                          message.target,
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
                          synthdevice.name(),
                          message.target,
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
                          synthdevice.name(),
                          message.target,
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
                          synthdevice.name(),
                          message.target,
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
        api_error(synthdevice.name(), message.target, `unknown fx ${fxname}`)
      }
      break
  }
})
