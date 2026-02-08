import {
  AudioToGain,
  Chorus,
  Compressor,
  Gain,
  Noise,
  Oscillator,
  Vibrato,
  Volume,
  getContext,
  getDestination,
} from 'tone'
import { MAYBE } from 'zss/mapping/types'

import { createsynthdrums } from './drums'
import { volumetodb } from './fx'
import { SidechainCompressor } from './sidechainworkletnode'

export type AUDIO_CHAIN = ReturnType<typeof createaudiochain>

export function createaudiochain() {
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

  const drum = createsynthdrums(drumvolume, drumaction)

  return {
    mainvolume,
    broadcastdestination,
    razzlegain,
    playvolume,
    drumvolume,
    bgplayvolume,
    ttsvolume,
    drum,
  }
}
