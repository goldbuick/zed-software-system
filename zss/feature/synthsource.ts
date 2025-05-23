import {
  Synth,
  Sampler,
  getContext,
  FMSynth,
  MetalSynth,
  BiquadFilter,
} from 'tone'
import { deepcopy, MAYBE } from 'zss/mapping/types'

export enum SOURCE_TYPE {
  SYNTH,
  RETRO_NOISE,
  BUZZ_NOISE,
  CLANG_NOISE,
  METALLIC_NOISE,
  BELLS,
}

const RETRO_SAMPLE_COUNT = 131072
function generatenoisesynth(source: SOURCE_TYPE) {
  const wave = getContext().createBuffer(
    1,
    RETRO_SAMPLE_COUNT,
    getContext().sampleRate,
  )
  let drumbuffer = 1
  const wavebuffer = wave.getChannelData(0)
  for (let i = 0; i < RETRO_SAMPLE_COUNT; i++) {
    if (source === SOURCE_TYPE.METALLIC_NOISE) {
      wavebuffer[i] = (drumbuffer & 1) * 4.0 * (Math.random() * 14 + 1) - 8.0 // metallic
    } else {
      wavebuffer[i] = (drumbuffer & 1) * 2.0 - 1.0 // everything else
    }
    let newbuffer: number = drumbuffer >> 1
    if (((drumbuffer + newbuffer) & 1) == 1) {
      switch (source) {
        default:
        case SOURCE_TYPE.RETRO_NOISE:
          newbuffer += 1 << 14 // retro
          break
        case SOURCE_TYPE.CLANG_NOISE:
          newbuffer += 2 << 14 // clang
          break
        case SOURCE_TYPE.BUZZ_NOISE:
          newbuffer += 10 << 2 // buzz
          break
        case SOURCE_TYPE.METALLIC_NOISE:
          newbuffer += 15 << 2 // metallic
          break
      }
    }
    drumbuffer = newbuffer
  }
  return wave
}

export type SOURCE =
  | {
      type: SOURCE_TYPE.SYNTH
      synth: Synth
    }
  | {
      type:
        | SOURCE_TYPE.RETRO_NOISE
        | SOURCE_TYPE.BUZZ_NOISE
        | SOURCE_TYPE.CLANG_NOISE
        | SOURCE_TYPE.METALLIC_NOISE
      synth: Sampler
      filter1: BiquadFilter
      filter2: BiquadFilter
    }
  | {
      type: SOURCE_TYPE.BELLS
      synth: FMSynth
      sparkle: MetalSynth
    }

export function createsource(sourcetype: SOURCE_TYPE) {
  let source: MAYBE<SOURCE>
  let resetvalues: any

  function applyreset() {
    switch (source?.type) {
      case SOURCE_TYPE.SYNTH: {
        source.synth.set({
          ...resetvalues,
          envelope: {
            ...resetvalues.envelope,
            attack: 0.01,
            decay: 0.01,
            sustain: 0.5,
            release: 0.01,
          },
          oscillator: {
            ...resetvalues.oscillator,
            type: 'square',
          },
        })
        break
      }
      case SOURCE_TYPE.RETRO_NOISE: {
        source.synth.set({
          ...resetvalues,
          attack: 0.01,
          decay: 0.01,
          sustain: 0.5,
          release: 0.01,
        })
        break
      }
      case SOURCE_TYPE.BELLS: {
        source.synth.set({
          ...resetvalues,
          harmonicity: 1.5,
          modulationIndex: 30,
          oscillator: {
            type: 'sine',
          },
          modulation: {
            type: 'square',
          },
          envelope: {
            attack: 0.01,
            decay: 3,
            sustain: 0.3,
            release: 6,
          },
          modulationEnvelope: {
            attack: 0.5,
            decay: 1,
            sustain: 0.2,
            release: 4,
          },
        })
        break
      }
    }
  }

  switch (sourcetype) {
    case SOURCE_TYPE.SYNTH: {
      source = {
        type: sourcetype,
        synth: new Synth(),
      }
      resetvalues = deepcopy(source.synth.get())
      applyreset()
      return {
        source,
        applyreset,
      }
    }
    case SOURCE_TYPE.RETRO_NOISE:
    case SOURCE_TYPE.BUZZ_NOISE:
    case SOURCE_TYPE.CLANG_NOISE:
    case SOURCE_TYPE.METALLIC_NOISE: {
      source = {
        type: sourcetype,
        synth: new Sampler({
          volume: -44,
          urls: {
            C4: generatenoisesynth(sourcetype),
          },
        }),
        filter1: new BiquadFilter({
          type: 'lowshelf',
          gain: -32,
          frequency: 440,
        }),
        filter2: new BiquadFilter({
          type: 'highshelf',
          gain: 32,
          frequency: 440,
        }),
      }
      resetvalues = deepcopy(source.synth.get())
      applyreset()
      return {
        source,
        applyreset,
      }
    }
    case SOURCE_TYPE.BELLS: {
      source = {
        type: SOURCE_TYPE.BELLS,
        synth: new FMSynth(),
        sparkle: new MetalSynth({
          volume: -20,
          envelope: { attack: 0.001, decay: 1.4, release: 0.2 },
          harmonicity: 5.1,
          modulationIndex: 32,
          resonance: 4000,
          octaves: 1.5,
        }),
      }
      resetvalues = deepcopy(source.synth.get())
      applyreset()
      return {
        source,
        applyreset,
      }
    }
  }
}
