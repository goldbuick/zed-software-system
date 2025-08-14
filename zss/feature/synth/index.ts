import { Note } from 'tonal'
import {
  AudioToGain,
  Chorus,
  Compressor,
  Gain,
  Noise,
  Oscillator,
  Part,
  Player,
  Time,
  ToneAudioBuffer,
  Vibrato,
  Volume,
  getContext,
  getDestination,
  getDraw,
} from 'tone'
import { vm_synthsend } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { randominteger } from 'zss/mapping/number'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'

import { createsynthdrums } from './drums'
import { createfx, createfxchannels, volumetodb } from './fx'
import {
  SYNTH_INVOKE,
  SYNTH_NOTE_ON,
  SYNTH_SFX_RESET,
  invokeplay,
  parseplay,
} from './playnotation'
import { SidechainCompressor } from './sidechainworkletnode'
import { SOURCE_TYPE, createsource } from './source'

export function createsynth() {
  const destination = getDestination()
  const broadcastdestination = getContext().createMediaStreamDestination()

  const mainvolume = new Volume()
  mainvolume.connect(destination)
  mainvolume.connect(broadcastdestination)

  const razzlegain = new Gain(10)

  const razzledazzle = new Vibrato({
    maxDelay: 0.005, // subtle pitch modulation
    frequency: 1.5, // speed of the warble
    depth: 0.2, // amount of pitch variation
    type: 'sine', // waveform type
    wet: 0.6, // mix level
  })

  const razzlechorus = new Chorus({
    frequency: 0.6,
    delayTime: 7,
    depth: 0.7,
    type: 'sine',
    spread: 128,
    wet: 0.5,
  })

  // tape hiss
  const hiss = new Noise({ type: 'pink', volume: -42 })
  const hissvolume = new Volume()

  // hiss mod
  const fsmap = new AudioToGain()
  const cyclesource = new Oscillator(Math.PI * 0.25, 'sine')
  cyclesource.chain(fsmap, hissvolume.volume)
  cyclesource.start()
  hiss.start()

  // setup
  hiss.chain(hissvolume, razzlechorus)
  razzledazzle.chain(razzlechorus, mainvolume)

  const maincompressor = new Compressor({
    threshold: -24,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
    knee: 30,
  })
  razzlegain.chain(maincompressor, razzledazzle)

  const sidechaincompressor = new SidechainCompressor({
    threshold: -42,
    ratio: 4,
    attack: 0.005,
    release: 0.005,
    mix: 0.777,
    makeupGain: 24,
  })
  sidechaincompressor.connect(razzlegain)

  const altaction = new Volume(-12)
  const drumaction = new Volume(-32)

  const playvolume = new Volume(volumetodb(20))
  playvolume.connect(sidechaincompressor)

  const drumvolume = new Volume(volumetodb(100))
  drumvolume.connect(razzlegain)

  const bgplayvolume = new Volume()
  bgplayvolume.connect(razzlegain)
  bgplayvolume.connect(altaction)

  const ttsvolume = new Volume()
  ttsvolume.connect(razzlegain)
  ttsvolume.connect(altaction)

  // side-chain input
  altaction.connect(sidechaincompressor.sidechain)
  drumaction.connect(sidechaincompressor.sidechain)

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
  // single fx chain
  const FXCHAIN = createfx()

  // 0 FX - play
  // 1 FX - play
  // 2 FX - bgplay
  // this affords controlling the wet 0/1 ratio sent to effects
  const FX = [createfxchannels(1), createfxchannels(2), createfxchannels(3)]
  for (let i = 0; i < FX.length; ++i) {
    const f = FX[i]
    f.fc.connect(FXCHAIN.fc)
    f.echo.connect(FXCHAIN.echo)
    f.reverb.connect(FXCHAIN.reverb)
    f.phaser.connect(FXCHAIN.phaser)
    f.vibrato.connect(FXCHAIN.vibrato)
    f.distortion.connect(FXCHAIN.distortion)
    f.autowah.connect(FXCHAIN.autowah)
    const isplay = i < 2
    const dest = isplay ? playvolume : bgplayvolume
    FXCHAIN.fc.connect(dest)
    FXCHAIN.echo.connect(dest)
    FXCHAIN.reverb.connect(dest)
    FXCHAIN.phaser.connect(dest)
    FXCHAIN.vibrato.connect(dest)
    FXCHAIN.distortion.connect(dest)
    FXCHAIN.autowah.connect(dest)
  }

  function mapindextofx(index: number) {
    return index < 4 ? Math.floor(index / 2) : 2
  }

  function connectsource(index: number) {
    const f = mapindextofx(index)
    const isplay = index < 4
    const dest = isplay ? playvolume : bgplayvolume

    // everything not noise
    switch (SOURCE[index]?.source.type) {
      case SOURCE_TYPE.RETRO_NOISE:
      case SOURCE_TYPE.BUZZ_NOISE:
      case SOURCE_TYPE.CLANG_NOISE:
      case SOURCE_TYPE.METALLIC_NOISE:
        // skip
        break
      default:
        // connect synth
        SOURCE[index]?.source.synth.connect(dest)
        SOURCE[index]?.source.synth.connect(FX[f].sendtofx)
        break
    }

    // noise & bells
    switch (SOURCE[index]?.source.type) {
      case SOURCE_TYPE.RETRO_NOISE:
      case SOURCE_TYPE.BUZZ_NOISE:
      case SOURCE_TYPE.CLANG_NOISE:
      case SOURCE_TYPE.METALLIC_NOISE:
        // filtered synth
        SOURCE[index]?.source.synth.chain(
          SOURCE[index]?.source.filter1,
          SOURCE[index]?.source.filter2,
          dest,
        )
        SOURCE[index]?.source.synth.chain(
          SOURCE[index]?.source.filter1,
          SOURCE[index]?.source.filter2,
          FX[f].sendtofx,
        )
        break
      case SOURCE_TYPE.BELLS: {
        // second synth
        SOURCE[index]?.source.sparkle.connect(dest)
        SOURCE[index]?.source.sparkle.connect(FX[f].sendtofx)
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
  const drum = createsynthdrums(drumvolume, drumaction)

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
        getDraw().schedule(
          () => vm_synthsend(SOFTWARE, '', note.slice(1)),
          time,
        )
      } else {
        // razzle dazzle code
        switch (SOURCE[chan].source.type) {
          case SOURCE_TYPE.BELLS:
            SOURCE[chan].source.synth.detune.value = randominteger(-3, 3)
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
        FXCHAIN.vibrato.depth.rampTo(1, '2n', time)
        FXCHAIN.vibrato.depth.rampTo(0, reset, time + sduration - rampreset)
        FXCHAIN.vibrato.frequency.rampTo(5, '4n', time)
        FXCHAIN.vibrato.frequency.rampTo(1, reset, time + sduration - rampreset)
      }
    }
    if (isnumber(note)) {
      switch (note) {
        case 0: // DRUM_TICK
          drum.ticktrigger(time)
          break
        case 1: // DRUM_TWEET
          drum.tweettrigger(time)
          break
        case 2: // DRUM_COWBELL
          drum.cowbelltrigger(duration, time)
          break
        case 3: // DRUM_CLAP
          drum.claptrigger(duration, time)
          break
        case 4: // DRUM_HI_SNARE
          drum.hisnaretrigger(duration, time)
          break
        case 5: // DRUM_HI_WOODBLOCK
          drum.hiwoodblocktrigger(duration, time)
          break
        case 6: // DRUM_LOW_SNARE
          drum.lowsnaretrigger(duration, time)
          break
        case 7: // DRUM_LOW_TOM
          drum.lowtomtrigger(duration, time)
          break
        case 8: // DRUM_LOW_WOODBLOCK
          drum.lowwoodblocktrigger(duration, time)
          break
        case 9: // DRUM_BASS
          drum.basstrigger(time)
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

  // handle music
  function addplay(buffer: string) {
    // parse ops
    const invokes = parseplay(buffer)
    const seconds = Time('+0').toSeconds()

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

  // handle sfx
  function addbgplay(buffer: string, quantize: string) {
    // parse ops
    const invokes = parseplay(buffer)
    const seconds = Time(quantize ? quantize : '+0.05').toSeconds()

    // handle sfx
    for (let i = 0; i < invokes.length; ++i) {
      synthplaystart(bgplayindex++, seconds, invokes[i], false)
      if (bgplayindex >= SOURCE.length) {
        bgplayindex = SYNTH_SFX_RESET
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
    mainvolume.volume.value = volumetodb(volume * 0.25)
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
  setttsvolume(25)
  setplayvolume(80)
  setbgplayvolume(100)

  return {
    broadcastdestination,
    addplay,
    addbgplay,
    stopplay,
    addttsaudiobuffer,
    setplayvolume,
    setbgplayvolume,
    setttsvolume,
    SOURCE,
    FX,
    FXCHAIN,
    changesource,
  }
}

export type AUDIO_SYNTH = ReturnType<typeof createsynth>
