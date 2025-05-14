import { Note } from 'tonal'
import {
  AudioToGain,
  Chorus,
  Compressor,
  Distortion,
  EQ3,
  Filter,
  Frequency,
  Gain,
  getContext,
  getDestination,
  getTransport,
  MembraneSynth,
  Noise,
  NoiseSynth,
  Oscillator,
  Part,
  Player,
  PolySynth,
  Scale,
  Synth,
  Time,
  ToneAudioBuffer,
  Volume,
} from 'tone'
import { vm_synthsend } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'

import {
  invokeplay,
  parseplay,
  SYNTH_INVOKE,
  SYNTH_NOTE_ON,
  SYNTH_SFX_RESET,
} from './play'
import { createfx } from './synthfx'
import { createsource, SOURCE_TYPE } from './synthsource'

// 0 to 100
function volumetodb(value: number) {
  return 20 * Math.log10(value) - 35
}

export function createsynth() {
  const destination = getDestination()
  const broadcastdestination = getContext().createMediaStreamDestination()

  const mainvolume = new Volume(-4)
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

  const razzledazzle = new Chorus()
  razzledazzle.set({
    wet: 0.5555,
    depth: 0.89,
    delayTime: 8,
  })
  razzledazzle.connect(maincompressor)

  const fuzzysource = new Noise({ type: 'pink' })
  const fsmap = new AudioToGain()

  const fstexture = new Scale(0, 0.02)
  fuzzysource.chain(fsmap, fstexture, razzledazzle)
  fuzzysource.start(0)

  const cyclesource = new Oscillator(0.125, 'sine')
  const fsfeedback = new Scale(0, 0.333)
  const fsfrequency = new Scale(0.0001, 5)
  cyclesource.chain(fsmap, fsfeedback, razzledazzle.feedback)
  cyclesource.chain(fsmap, fsfrequency, razzledazzle.frequency)
  cyclesource.start()

  const playvolume = new Volume()
  playvolume.connect(razzledazzle)

  const bgplayvolume = new Volume()
  bgplayvolume.connect(razzledazzle)

  const ttsvolume = new Volume()
  ttsvolume.connect(razzledazzle)

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
  // 0 FX - play
  // 1 FX - play
  // 2 FX - bgplay
  const FX = [createfx(), createfx(), createfx()]

  function mapindextofx(index: number) {
    return index < 4 ? Math.floor(index / 2) : 2
  }

  function connectsource(index: number) {
    const f = mapindextofx(index)
    switch (SOURCE[index]?.source.type) {
      case SOURCE_TYPE.RETRO_NOISE:
      case SOURCE_TYPE.BUZZ_NOISE:
      case SOURCE_TYPE.CLANG_NOISE:
      case SOURCE_TYPE.METALLIC_NOISE:
        // skip
        break
      default:
        // connect synth
        SOURCE[index]?.source.synth.chain(
          FX[f].fc,
          FX[f].distortion,
          FX[f].vibrato,
          FX[f].phaser,
          FX[f].echo,
          FX[f].reverb,
          index < 4 ? playvolume : bgplayvolume,
        )
        break
    }
    switch (SOURCE[index]?.source.type) {
      case SOURCE_TYPE.RETRO_NOISE:
      case SOURCE_TYPE.BUZZ_NOISE:
      case SOURCE_TYPE.CLANG_NOISE:
      case SOURCE_TYPE.METALLIC_NOISE:
        // filtered synth
        SOURCE[index]?.source.synth.chain(
          SOURCE[index]?.source.filter1,
          SOURCE[index]?.source.filter2,
          FX[f].fc,
          FX[f].distortion,
          FX[f].vibrato,
          FX[f].phaser,
          FX[f].echo,
          FX[f].reverb,
          index < 4 ? playvolume : bgplayvolume,
        )
        break
      case SOURCE_TYPE.BELLS: {
        // second synth
        SOURCE[index]?.source.sparkle.chain(
          FX[f].fc,
          FX[f].distortion,
          FX[f].vibrato,
          FX[f].phaser,
          FX[f].echo,
          FX[f].reverb,
          index < 4 ? playvolume : bgplayvolume,
        )
        break
      }
    }
  }

  for (let i = 0; i < SOURCE.length; ++i) {
    connectsource(i)
  }

  function changesource(index: number, type: SOURCE_TYPE) {
    if (SOURCE[index]?.source.type === type) {
      return
    }
    SOURCE[index]?.source.synth.dispose()
    SOURCE[index] = createsource(type)
    connectsource(index)
  }

  // config drums

  // drumtick

  const drumtick = new PolySynth().connect(playvolume)
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

  const drumtweet = new Synth().connect(playvolume)
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

  const drumcowbellfilter = new Filter(350, 'bandpass').connect(playvolume)

  const drumcowbellgain = new Gain().connect(drumcowbellfilter)
  drumcowbellgain.gain.value = 0

  const drumcowbell = new PolySynth().connect(drumcowbellgain)
  drumcowbell.volume.value = 16.0
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

  const drumclapeq = new EQ3(-10, 10, -1).connect(playvolume)

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

  const drumhisnaredistortion = new Distortion().connect(playvolume)
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
  drumhiwoodblockfilter.connect(playvolume)

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

  const drumlowsnaredistortion = new Distortion().connect(playvolume)
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

  const drumlowtomosc = new Synth().connect(playvolume)
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

  const drumlowtomosc2 = new Synth().connect(playvolume)
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

  const drumlowtomnoise = new NoiseSynth().connect(playvolume)
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
  drumlowwoodblockfilter.connect(playvolume)

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

  const drumbass = new MembraneSynth().connect(playvolume)
  drumbass.set({
    octaves: 8,
    volume: 8.0,
    pitchDecay: 0.125,
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
    const f = mapindextofx(chan)
    if (isstring(note) && ispresent(SOURCE[chan]) && ispresent(FX[f])) {
      if (note.startsWith('#')) {
        vm_synthsend(SOFTWARE, '', note.slice(1))
      } else {
        // razzle dazzle code
        switch (SOURCE[chan].source.type) {
          case SOURCE_TYPE.BELLS:
            SOURCE[chan].source.synth.detune.value = Math.random() * 10 - 5
            SOURCE[chan].source.sparkle.triggerAttackRelease(
              Note.transposeOctaves(note, 2),
              duration,
              time,
            )
            break
          default:
            break
        }
        SOURCE[chan].source.synth.triggerAttackRelease(note, duration, time)
        const sduration = SOURCE[chan].source.synth.toSeconds(duration)
        const reset = '128n'
        const rampreset = SOURCE[chan].source.synth.toSeconds(reset)
        FX[f].vibrato.depth.rampTo(1, '2n', time)
        FX[f].vibrato.depth.rampTo(0, reset, time + sduration - rampreset)
        FX[f].vibrato.frequency.rampTo(5, '4n', time)
        FX[f].vibrato.frequency.rampTo(1, reset, time + sduration - rampreset)
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
    const seconds = getTransport().seconds + 0.1

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
  function setplayvolume(volume: number) {
    playvolume.volume.value = volumetodb(volume)
  }
  function setbgplayvolume(volume: number) {
    bgplayvolume.volume.value = volumetodb(volume)
  }

  // tts output
  function addttsaudiobuffer(audiobuffer: AudioBuffer | ToneAudioBuffer) {
    const player = new Player(audiobuffer).connect(ttsvolume)
    player.start(0)
  }

  function setttsvolume(volume: number) {
    ttsvolume.volume.value = volume
  }

  // set default volumes
  setttsvolume(15)
  setplayvolume(75)
  setbgplayvolume(100)

  return {
    broadcastdestination,
    addplay,
    stopplay,
    addttsaudiobuffer,
    setplayvolume,
    setbgplayvolume,
    setttsvolume,
    SOURCE,
    FX,
    changesource,
  }
}

export type AUDIO_SYNTH = ReturnType<typeof createsynth>
