import { Note } from 'tonal'
import {
  AudioToGain,
  Chorus,
  Compressor,
  Gain,
  Noise,
  Offline,
  Oscillator,
  Part,
  Player,
  Time,
  ToneAudioBuffer,
  Vibrato,
  Volume,
  getContext,
  getDestination,
  getTransport,
} from 'tone'
import { api_error } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { createnameid } from 'zss/mapping/guid'
import { randominteger } from 'zss/mapping/number'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'

import { write } from '../writeui'

import { createsynthdrums } from './drums'
import { addfcrushmodule } from './fcrushworkletnode'
import { createfx, createfxchannels, volumetodb } from './fx'
import { converttomp3 } from './mp3'
import {
  SYNTH_INVOKE,
  SYNTH_NOTE_ENTRY,
  SYNTH_NOTE_ON,
  SYNTH_SFX_RESET,
  invokeplay,
  parseplay,
} from './playnotation'
import { SidechainCompressor, addsidechainmodule } from './sidechainworkletnode'
import { SOURCE_TYPE, createsource } from './source'

export async function setupsynth() {
  // add custom audio worklet modules
  await addfcrushmodule()
  await addsidechainmodule()
}

export function createsynth() {
  const destination = getDestination()

  const mainvolume = new Volume()
  mainvolume.connect(destination)

  let broadcastdestination: MAYBE<MediaStreamAudioDestinationNode>
  if (!getContext().isOffline) {
    broadcastdestination = getContext().createMediaStreamDestination()
    mainvolume.connect(broadcastdestination)
  }

  const razzlegain = new Gain()

  const razzledazzle = new Vibrato({
    maxDelay: 0.005, // subtle pitch modulation
    frequency: 0.125, // speed of the warble
    depth: 0.3, // amount of pitch variation
    type: 'square', // waveform type
    wet: 0.1, // mix level
  })

  const razzlechorus = new Chorus({
    frequency: 0.01,
    delayTime: 7,
    depth: 0.7,
    type: 'sawtooth',
    spread: 128,
    wet: 0.5,
  })
  razzlechorus.start()

  // tape hiss
  const hiss = new Noise({ type: 'pink', volume: -50 })
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
    threshold: -28,
    ratio: 4,
    attack: 0.003,
    release: 0.15,
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
  // playvolume.connect(razzlegain)

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

  // 8track SYNTH
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
  // 1 FX - play
  // 2 FX - play
  // 3 FX - bgplay
  // 4 FX - tts
  const FX = [
    createfxchannels(1),
    createfxchannels(2),
    createfxchannels(3),
    createfxchannels(4),
  ]
  // this affords controlling the wet 0/1 ratio sent to effects
  for (let i = 0; i < FX.length; ++i) {
    const f = FX[i]
    const isplay = i < 2
    const dest = isplay ? playvolume : bgplayvolume
    // wire up fx & input to dest
    f.sendtofx.connect(dest)
    f.fc.chain(FXCHAIN.fc, dest)
    f.echo.chain(FXCHAIN.echo, dest)
    f.reverb.chain(FXCHAIN.reverb, dest)
    f.phaser.chain(FXCHAIN.phaser, dest)
    f.vibrato.chain(FXCHAIN.vibrato, dest)
    f.distortion.chain(FXCHAIN.distortion, dest)
    f.autowah.chain(FXCHAIN.autowah, dest)
  }

  function mapindextofx(index: number) {
    return index < 4 ? Math.floor(index / 2) : 2
  }

  function connectsource(index: number) {
    const f = mapindextofx(index)
    if (!ispresent(SOURCE[index])) {
      return
    }

    // everything not noise
    switch (SOURCE[index].source.type) {
      case SOURCE_TYPE.RETRO_NOISE:
      case SOURCE_TYPE.BUZZ_NOISE:
      case SOURCE_TYPE.CLANG_NOISE:
      case SOURCE_TYPE.METALLIC_NOISE:
        // skip
        break
      default:
        // connect synth
        SOURCE[index].source.synth.connect(FX[f].sendtofx)
        break
    }

    // noise & bells
    switch (SOURCE[index].source.type) {
      case SOURCE_TYPE.RETRO_NOISE:
      case SOURCE_TYPE.BUZZ_NOISE:
      case SOURCE_TYPE.CLANG_NOISE:
      case SOURCE_TYPE.METALLIC_NOISE:
        // filtered synth
        SOURCE[index].source.synth.chain(
          SOURCE[index].source.filter1,
          SOURCE[index].source.filter2,
          FX[f].sendtofx,
        )
        break
      case SOURCE_TYPE.BELLS: {
        // second synth
        SOURCE[index].source.sparkle.connect(FX[f].sendtofx)
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
  let pacer = new Part(synthtick)
  let recordlastpercent = 0
  let recordisrendering = 0
  let recordedticks: SYNTH_NOTE_ENTRY[] = []

  function applyreplay(source: any[], fxchain: any, fx: any[]) {
    source.forEach((item, index) => {
      changesource(index, item.type)
      SOURCE[index].setreplay(item)
    })
    FXCHAIN.setreplay(fxchain)
    fx.forEach((item, index) => {
      FX[index].setreplay(item)
    })
  }

  function synthflush() {
    recordedticks = []
    recordlastpercent = 0
    recordisrendering = 0
  }

  function synthrecord(filename: string) {
    if (recordedticks.length) {
      const player = registerreadplayer()
      // calc range
      const times = recordedticks.map((item) => {
        const [time] = item
        return time
      })

      // give the first note a tenth of a second before starting
      const mintime = Math.min(...times)
      const maxtime = Math.max(...times)

      // add 5 seconds after maxtime
      const duration = Math.ceil(maxtime - mintime + 5.0)

      // adjust time ticks
      const offlineticks: SYNTH_NOTE_ENTRY[] = []
      for (let i = 0; i < recordedticks.length; ++i) {
        const [time, value] = recordedticks[i]
        offlineticks.push([time - mintime + 0.1, value])
      }

      // grab source and fx state
      const sourcereplay = SOURCE.map((item) => item.getreplay())
      const fxchainreplay = FXCHAIN.getreplay()
      const fxreplay = FX.map((item) => item.getreplay())
      let audio: MAYBE<ReturnType<typeof createsynth>>
      Offline(async ({ transport }) => {
        write(SOFTWARE, player, 'create synth')
        await setupsynth()
        audio = createsynth()

        // wait for node setup
        write(SOFTWARE, player, 'synth waiting for setup')
        await waitfor(2000)

        // config & run
        audio.setplayvolume(80)
        audio.applyreplay(sourcereplay, fxchainreplay, fxreplay)
        audio.synthreplay(offlineticks, maxtime)

        // begin
        write(SOFTWARE, player, 'rendering audio')
        transport.start(0)
      }, duration)
        .then((buffer) => {
          write(SOFTWARE, player, 'rendering complete, exporting mp3')
          // Convert the buffer to MP3
          const mp3Data = converttomp3(buffer)
          return mp3Data
        })
        .then((mp3Data) => {
          // Create a download link
          const anchor = document.createElement('a')
          anchor.href = URL.createObjectURL(
            new Blob([mp3Data as BlobPart], { type: 'audio/mp3' }),
          )
          anchor.download = `${filename || createnameid()}.mp3`
          write(SOFTWARE, player, `saving file ${anchor.download}`)

          anchor.click()

          // clean up
          audio?.destroy()
        })
        .catch((err) => {
          api_error(SOFTWARE, player, 'synthrecord', err)
        })
    }

    // reset recording state
    synthflush()
  }

  function synthtick(time: number, value: SYNTH_NOTE_ON | null) {
    if (value === null) {
      return
    }
    if (recordisrendering > 0) {
      const currentpercent = Math.round((time / recordisrendering) * 100)
      if (currentpercent !== recordlastpercent) {
        recordlastpercent = currentpercent
        write(SOFTWARE, registerreadplayer(), `${currentpercent}%`)
      }
    } else {
      recordedticks.push([time, value])
    }
    const [chan, duration, note] = value
    const f = mapindextofx(chan)
    if (isstring(note) && ispresent(SOURCE[chan]) && ispresent(FX[f])) {
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

  function synthreplay(pattern: SYNTH_NOTE_ENTRY[], maxtime: number) {
    // signal recording state
    recordlastpercent = 0
    recordisrendering = maxtime
    // write pattern to pacer
    for (let p = 0; p < pattern.length; ++p) {
      const [time, value] = pattern[p]
      pacer.add(time, value)
    }
  }

  let pacertime = -1
  let pacercount = 0
  let bgplayindex = SYNTH_SFX_RESET

  // handle music
  function addplay(buffer: string) {
    // parse ops
    const invokes = parseplay(buffer)

    // reset note offset
    if (pacertime === -1) {
      pacertime = getTransport().now()
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

  // stop playback
  function stopplay() {
    pacer.clear()
    pacertime = -1
    pacercount = 0
  }

  function setbpm(bpm: number) {
    stopplay()
    getTransport().bpm.setValueAtTime(bpm, 0)
    // @ts-expect-error please ignore
    pacer = new Part(synthtick)
    pacer.start(0)
  }

  // adjust main volumes
  function setplayvolume(volume: number) {
    mainvolume.volume.value = volumetodb(volume * 0.25)
  }
  function setbgplayvolume(volume: number) {
    bgplayvolume.volume.value = volumetodb(volume)
  }

  // tts output
  function addaudiobuffer(audiobuffer: AudioBuffer | ToneAudioBuffer) {
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

  // start pacer
  pacer.start(0)

  function applyreset() {
    SOURCE.forEach((item, index) => {
      changesource(index, SOURCE_TYPE.SYNTH)
      item.applyreset()
      item.source.synth.set({
        oscillator: {
          type: 'square',
        },
      })
    })
    FX.forEach((item) => item.applyreset())
    FXCHAIN.applyreset()
  }

  function destroy() {
    SOURCE.forEach((item) => item.destroy())
    FX.forEach((item) => item.destroy())
    FXCHAIN.destroy()
    mainvolume.dispose()
  }

  return {
    destroy,
    broadcastdestination,
    addplay,
    addbgplay,
    stopplay,
    applyreset,
    applyreplay,
    synthrecord,
    synthflush,
    synthreplay,
    addaudiobuffer,
    setbpm,
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
