import { Client } from '@gradio/client'
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
  getContext,
  ToneAudioBuffer,
} from 'tone'
import { createdevice } from 'zss/device'
import { ECHO_OFF, ECHO_ON, createfx } from 'zss/gadget/audio/fx'
import {
  invokeplay,
  parseplay,
  SYNTH_INVOKE,
  SYNTH_NOTE_ON,
  SYNTH_SFX_RESET,
} from 'zss/gadget/audio/play'
import { createsource, SOURCE_TYPE } from 'zss/gadget/audio/source'
import { setAltInterval } from 'zss/gadget/display/anim'
import { doasync } from 'zss/mapping/func'
import { clamp } from 'zss/mapping/number'
import { waitfor } from 'zss/mapping/tick'
import {
  isarray,
  isnumber,
  ispresent,
  isstring,
  MAYBE,
} from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import {
  api_error,
  synth_audioenabled,
  tape_info,
  vm_loader,
  vm_synthsend,
} from './api'
import { registerreadplayer } from './register'

// synth setup

type CustomNavigator = {
  audioSession?: {
    type: string
  }
} & Navigator

let enabled = false
export function enableaudio() {
  if (enabled) {
    return
  }
  start()
    .then(() => {
      if (!enabled) {
        const transport = getTransport()
        enabled = true
        transport.start()
        tape_info(synthdevice, 'audio is enabled!')
        setAltInterval(107)
        try {
          const customnavigator = navigator as CustomNavigator
          if (ispresent(customnavigator.audioSession)) {
            customnavigator.audioSession.type = 'playback'
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
          //
        }
        synth_audioenabled(synthdevice, registerreadplayer())
      }
    })
    .catch((err: any) => {
      api_error(synthdevice, 'audio', err.message)
    })
}

function createsynth() {
  const destination = getDestination()
  const broadcastdestination = getContext().createMediaStreamDestination()

  const mainvolume = new Volume(-10)
  mainvolume.connect(destination)
  mainvolume.connect(broadcastdestination)

  const maincompressor = new Compressor({
    threshold: -24,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
    knee: 30,
  })
  maincompressor.connect(mainvolume)

  const playvolume = new Volume(-5)
  playvolume.connect(maincompressor)

  const bgplayvolume = new Volume(0)
  bgplayvolume.connect(maincompressor)

  const drumvolume = new Volume(-4)
  drumvolume.connect(maincompressor)

  const ttsvolume = new Volume(0)
  ttsvolume.connect(maincompressor)

  // 8tracks
  const SOURCE = [
    createsource(SOURCE_TYPE.SYNTH),
    createsource(SOURCE_TYPE.SYNTH),
    createsource(SOURCE_TYPE.SYNTH),
    createsource(SOURCE_TYPE.SYNTH),
    createsource(SOURCE_TYPE.SYNTH),
    createsource(SOURCE_TYPE.SYNTH),
    createsource(SOURCE_TYPE.SYNTH),
    createsource(SOURCE_TYPE.SYNTH),
  ]

  // config fx
  // 0-1 FX 0 - play
  // 2-3 FX 1 - play
  // 4-7 FX 2 - bgplay
  const FX = [createfx(), createfx(), createfx()]

  function mapindextofx(index: number) {
    return index < 4 ? Math.floor(index / 2) : 2
  }

  function connectsource(index: number) {
    const f = mapindextofx(index)
    SOURCE[index].source.synth.chain(
      FX[f].vibrato,
      FX[f].chorus,
      FX[f].phaser,
      FX[f].distortion,
      FX[f].echo,
      FX[f].reverb,
      playvolume,
    )
  }

  for (let i = 0; i < SOURCE.length; ++i) {
    connectsource(i)
  }

  function changesource(index: number, type: SOURCE_TYPE) {
    if (SOURCE[index].source.type === type) {
      return
    }
    SOURCE[index].source.synth.dispose()
    SOURCE[index] = createsource(type)
    connectsource(index)
  }

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
      if (note.startsWith('#')) {
        vm_synthsend(synthdevice, note.slice(1))
      } else {
        SOURCE[chan].source.synth.triggerAttackRelease(note, duration, time)
      }
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
            pacer.clear()
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
    withendofpattern = true,
  ) {
    let endtime = starttime

    // build tone.js pattern
    const pattern = invokeplay(idx, starttime, invoke, withendofpattern)

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
  let bgplayindex = SYNTH_SFX_RESET
  function addplay(buffer: string, bgplay: boolean) {
    // parse ops
    const invokes = parseplay(buffer)
    const seconds = getTransport().seconds + 0.01

    if (bgplay) {
      // handle sfx
      for (let i = 0; i < invokes.length; ++i) {
        synthplaystart(bgplayindex++, seconds, invokes[i], false)
        if (bgplayindex >= SOURCE.length) {
          bgplayindex = SYNTH_SFX_RESET
        }
      }
    } else {
      // handle music

      // reset note offset
      if (pacertime === -1) {
        pacertime = seconds
      }

      // update count
      pacercount += invokes.length
      const starttime = pacertime
      for (let i = 0; i < invokes.length && i < SOURCE.length; ++i) {
        const endtime = synthplaystart(i, starttime, invokes[i])
        pacertime = Math.max(pacertime, endtime)
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

  // adjust main volumes
  function setmainvolume(volume: number) {
    mainvolume.volume.value = volume
  }
  function setdrumvolume(volume: number) {
    drumvolume.volume.value = volume
  }

  // tts output
  function addttsaudiobuffer(audiobuffer: AudioBuffer | ToneAudioBuffer) {
    const player = new Player(audiobuffer).connect(ttsvolume)
    player.start(0)
  }

  function setttsvolume(volume: number) {
    ttsvolume.volume.value = volume
  }

  return {
    broadcastdestination,
    addplay,
    stopplay,
    addttsaudiobuffer,
    setmainvolume,
    setdrumvolume,
    setttsvolume,
    SOURCE,
    FX,
    changesource,
    mapindextofx,
  }
}

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
        return true
      default:
        return SYNTH_VARIANTS.test(type)
    }
  }

  // failed
  return false
}

// get MicrosoftSpeechTTS instance
let tts: MAYBE<EdgeSpeechTTS>

// cache for #tta command
const tta = new Map<string, ToneAudioBuffer>()

let synth: MAYBE<ReturnType<typeof createsynth>>

export function synthbroadcastdestination(): MAYBE<MediaStreamAudioDestinationNode> {
  return synth?.broadcastdestination
}

const synthdevice = createdevice('synth', [], (message) => {
  if (!synthdevice.session(message)) {
    return
  }
  if (enabled && !ispresent(synth)) {
    synth = createsynth()
  }
  if (!ispresent(synth)) {
    return
  }
  switch (message.target) {
    case 'audioenabled':
      doasync(synthdevice, async () => {
        await waitfor(1000)
        vm_loader(
          synthdevice,
          undefined,
          'text',
          'audioenabled',
          '',
          registerreadplayer(),
        )
      })
      break
    case 'bpm':
      if (isnumber(message.data)) {
        setAltInterval(message.data)
      }
      break
    case 'mainvolume':
      if (isnumber(message.data)) {
        synth.setmainvolume(message.data)
      }
      break
    case 'drumvolume':
      if (isnumber(message.data)) {
        synth.setdrumvolume(message.data)
      }
      break
    case 'ttsvolume':
      if (isnumber(message.data)) {
        synth.setttsvolume(message.data)
      }
      break
    case 'play':
      if (isarray(message.data)) {
        const [buffer, bgplay] = message.data as [string, boolean]
        if (buffer === '') {
          // stop playback
          synth.stopplay()
        } else {
          // add to playback
          synth.addplay(buffer, bgplay)
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
          api_error(synthdevice, message.target, `unknown voice ${index}`)
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
                    synthdevice,
                    message.target,
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
              }

              api_error(synthdevice, message.target, `unknown config ${config}`)
            }
            break
        }
      }
      break
    case 'voicefx':
      // note: we do Math.floor(i / 4) here to get the correct fx chain
      if (isarray(message.data)) {
        const [synthindex, fxname, config, value] = message.data as [
          number,
          string,
          number | string,
          number | string,
        ]
        const index = synth.mapindextofx(synthindex)
        // @ts-expect-error not feeling it
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
                          synthdevice,
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
                          synthdevice,
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
                          synthdevice,
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
                          synthdevice,
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
                          synthdevice,
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
                          synthdevice,
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
        api_error(synthdevice, message.target, `unknown fx ${fxname}`)
      }
      break
    case 'tts':
      doasync(synthdevice, async () => {
        if (!ispresent(tts)) {
          tts = new EdgeSpeechTTS({ locale: 'en-US' })
        }
        if (ispresent(synth) && isarray(message.data)) {
          const [voice, phrase] = message.data as [string, string]
          const audiobuffer = await tts.createAudio({
            input: phrase,
            options: { voice: voice || 'en-US-GuyNeural' },
          })
          // play the audio
          synth.addttsaudiobuffer(audiobuffer)
        }
      })
      break
    case 'tta':
      doasync(synthdevice, async () => {
        if (ispresent(synth) && isarray(message.data)) {
          const [phrase] = message.data as [string]
          const app = await Client.connect('declare-lab/TangoFlux')
          const result = await app.predict('/predict', [phrase, 25, 4.5, 3.7])
          if (isarray(result.data) && isstring(result.data[0]?.url)) {
            // fetch buffer
            const maybebuffer = tta.get(phrase)
            if (ispresent(maybebuffer)) {
              // play the audio if
              if (maybebuffer.loaded) {
                synth.addttsaudiobuffer(maybebuffer)
              }
            } else {
              tta.set(phrase, new ToneAudioBuffer(result.data[0].url))
            }
          }
        }
      })
      break
  }
})
