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

const WARM_DRUM_DELTA_SEC = 0.5
/** Longest decay after warm start (snare osc release etc.); restore runs after this. */
const WARM_DRUM_TAIL_SEC = 1.0
const WARM_DRUM_DURATION = '64n'

function warmdrums(
  drum: ReturnType<typeof createsynthdrums>,
  drumvolume: Volume,
  drumaction: Volume,
) {
  drumvolume.mute = true
  drumaction.mute = true
  const t = getContext().currentTime + WARM_DRUM_DELTA_SEC
  drum.ticktrigger(t)
  drum.tweettrigger(t)
  drum.cowbelltrigger(WARM_DRUM_DURATION, t)
  drum.claptrigger(WARM_DRUM_DURATION, t)
  drum.hisnaretrigger(WARM_DRUM_DURATION, t)
  drum.hiwoodblocktrigger(WARM_DRUM_DURATION, t)
  drum.lowsnaretrigger(WARM_DRUM_DURATION, t)
  drum.lowtomtrigger(WARM_DRUM_DURATION, t)
  drum.lowwoodblocktrigger(WARM_DRUM_DURATION, t)
  drum.basstrigger(t)
  getContext().setTimeout(() => {
    drumvolume.mute = false
    drumaction.mute = false
  }, WARM_DRUM_DELTA_SEC + WARM_DRUM_TAIL_SEC)
}

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
    ratio: 5,
    attack: 0.005,
    release: 0.06,
    mix: 0.75,
    makeupGain: 24,
  })
  sidechaincompressor.connect(razzlegain)

  const altaction = new Volume(-12)
  const drumaction = new Volume(-28)

  const playvolume = new Volume(volumetodb(20))
  playvolume.connect(sidechaincompressor)

  const drumvolume = new Volume(volumetodb(100) + 10)
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

  if (!getContext().isOffline) {
    warmdrums(drum, drumvolume, drumaction)
  }

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
