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
} from 'tone'
import { createdevice } from 'zss/device'
import { createsource } from 'zss/gadget/audio/source'
import {
  invokeplay,
  parseplay,
  SYNTH_INVOKES,
  SYNTH_NOTE_ON,
} from 'zss/mapping/play'
import { isarray, isnumber, ispresent, isstring } from 'zss/mapping/types'

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
  const maincompressor = new Compressor({
    threshold: -20,
    ratio: 12,
    attack: 0,
    release: 0.3,
  })
  maincompressor.toDestination()

  const maingain = new Gain()
  maingain.connect(maincompressor)

  const drumgain = new Gain()
  drumgain.connect(maincompressor)

  const SOURCE = [
    // for sfx
    createsource(),
    // + 8track synths
    createsource(),
    createsource(),
    createsource(),
    createsource(),
    createsource(),
    createsource(),
    createsource(),
    createsource(),
  ]

  // config drums

  // drumtick

  const drumtick = new PolySynth().connect(drumgain)
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

  const drumtweet = new Synth().connect(drumgain)
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

  const drumcowbellfilter = new Filter(350, 'bandpass').connect(drumgain)

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

  const drumclapeq = new EQ3(-10, 10, -1).connect(drumgain)

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

  const drumhisnaredistortion = new Distortion().connect(drumgain)
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
  drumhiwoodblockfilter.connect(drumgain)

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

  const drumlowsnaredistortion = new Distortion().connect(drumgain)
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

  const drumlowtomosc = new Synth().connect(drumgain)
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

  const drumlowtomosc2 = new Synth().connect(drumgain)
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

  const drumlowtomnoise = new NoiseSynth().connect(drumgain)
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
  drumlowwoodblockfilter.connect(drumgain)

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

  const drumbass = new MembraneSynth().connect(drumgain)
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
          // reset priority ?
          synthsfxpriority = -1
          break
      }
    }
  }

  function synthplaystart(
    starttime: number,
    idx: number,
    invokes: SYNTH_INVOKES,
  ) {
    let endtime = starttime

    // invoke synth ops
    for (let i = 0; i < invokes.length; ++i) {
      // build tone.js pattern
      const pattern = invokeplay(idx, starttime, invokes[i])

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
    }

    return endtime
  }

  let pacertime = -1
  let pacercount = 0
  let synthsfxpriority = -1
  function addplay(priority: number, buffer: string) {
    // parse ops
    const invokes = parseplay(buffer)
    const seconds = getTransport().seconds

    // reset note offset
    if (pacertime === -1) {
      pacertime = seconds
    }

    // music queue
    if (priority < 0) {
      pacercount += invokes.length
      pacertime = synthplaystart(pacertime, -priority, invokes)
      return
    }

    // sfx /w priority
    if (synthsfxpriority === -1 || priority >= synthsfxpriority) {
      synthsfxpriority = priority
      synthplaystart(seconds, 0, invokes)
    }
  }

  // start it
  pacer.start(0)

  return { addplay, SOURCE }
}

function validatesynthtype(value: string) {
  if (isstring(value)) {
    const maybetype = value.toLowerCase()
    let type = maybetype
    // validate whole values only
    if (type === 'pwm' || type === 'pulse') {
      return true
    } else {
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
      const partial = parseFloat(type)
      if (isnumber(partial)) {
        return true
      }

      // failed
      return false
    }
  }
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
    case 'play':
      if (isarray(message.data)) {
        const [priority, buffer] = message.data as [number, string]
        // -negative priority means music synth 1-9
        // positive priority means sfx synth 0
        // only a single set of drums between music & sfx
        synth.addplay(priority, buffer)
      }
      break
    case 'voice':
      if (isarray(message.data)) {
        const [idx, config, value] = message.data as [
          number,
          number | string,
          number | string,
        ]
        const voice = synth.SOURCE[idx]
        if (ispresent(voice)) {
          switch (config) {
            case 'bpm':
              if (isnumber(value)) {
                getTransport().bpm.value = value
              }
              break
            case 'vol':
            case 'volume':
              if (isnumber(value)) {
                voice.source.volume.value = value
              }
              break
            default:
              if (isstring(config) && validatesynthtype(config)) {
                voice.source.set({
                  oscillator: {
                    // @ts-expect-error lazy
                    type: config,
                  },
                })
              } else {
                api_error(
                  synthdevice.name(),
                  message.target,
                  `unknown voice config ${config}`,
                )
              }
              break
          }
        } else {
          api_error(synthdevice.name(), message.target, `unknown voice ${idx}`)
        }
      }
      break
    case 'voicefx':
      if (isarray(message.data)) {
        const [idx, fxname, config, value] = message.data as [
          number,
          string,
          number | string,
          number | string,
        ]
        const voice = synth.SOURCE[idx]
        const fx = voice?.fx[fxname as keyof typeof voice.fx]
        if (ispresent(fx)) {
          switch (config) {
            case 'on':
              fx.wet.value = 0.1
              break
            case 'off':
              fx.wet.value = 0.0
              break
            default:
              if (isnumber(value)) {
                fx.wet.value = 0.1 * value
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
        } else {
          api_error(synthdevice.name(), message.target, `unknown fx ${fxname}`)
        }
      }
      break
  }
})