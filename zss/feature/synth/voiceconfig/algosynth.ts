import { isarray, isnumber, isstring } from 'zss/mapping/types'

import { SOURCE_TYPE } from '../source'

type AlgoVoice = {
  source: { type: SOURCE_TYPE.ALGO_SYNTH; synth: { set: (v: object) => void } }
}

export function handlealgosynthconfig(
  _player: string,
  voice: AlgoVoice,
  config: string,
  value: number | string | number[],
): boolean {
  if (voice.source.type !== SOURCE_TYPE.ALGO_SYNTH) {
    return false
  }

  switch (config) {
    case 'harmonicity':
      if (isnumber(value)) {
        voice.source.synth.set({
          harmonicity1: value,
          harmonicity2: value,
          harmonicity3: value,
        })
        return true
      }
      break
    case 'harmonicity1':
      if (isnumber(value)) {
        voice.source.synth.set({ harmonicity1: value })
        return true
      }
      break
    case 'harmonicity2':
      if (isnumber(value)) {
        voice.source.synth.set({ harmonicity2: value })
        return true
      }
      break
    case 'harmonicity3':
      if (isnumber(value)) {
        voice.source.synth.set({ harmonicity3: value })
        return true
      }
      break
    case 'modindex':
      if (isnumber(value)) {
        voice.source.synth.set({
          modulationindex1: value,
          modulationindex2: value,
          modulationindex3: value,
        })
        return true
      }
      break
    case 'modindex1':
      if (isnumber(value)) {
        voice.source.synth.set({ modulationindex1: value })
        return true
      }
      break
    case 'modindex2':
      if (isnumber(value)) {
        voice.source.synth.set({ modulationindex2: value })
        return true
      }
      break
    case 'modindex3':
      if (isnumber(value)) {
        voice.source.synth.set({ modulationindex3: value })
        return true
      }
      break
    case 'osc1':
      if (isstring(value)) {
        voice.source.synth.set({
          oscillator1: { type: value } as { type: string },
        })
        return true
      }
      break
    case 'osc2':
      if (isstring(value)) {
        voice.source.synth.set({
          oscillator2: { type: value } as { type: string },
        })
        return true
      }
      break
    case 'osc3':
      if (isstring(value)) {
        voice.source.synth.set({
          oscillator3: { type: value } as { type: string },
        })
        return true
      }
      break
    case 'osc4':
      if (isstring(value)) {
        voice.source.synth.set({
          oscillator4: { type: value } as { type: string },
        })
        return true
      }
      break
    case 'env1':
    case 'envelope1':
      if (isarray(value)) {
        const [attack, decay, sustain, release] = value
        voice.source.synth.set({
          envelope1: { attack, decay, sustain, release },
        })
        return true
      }
      break
    case 'env2':
    case 'envelope2':
      if (isarray(value)) {
        const [attack, decay, sustain, release] = value
        voice.source.synth.set({
          envelope2: { attack, decay, sustain, release },
        })
        return true
      }
      break
    case 'env3':
    case 'envelope3':
      if (isarray(value)) {
        const [attack, decay, sustain, release] = value
        voice.source.synth.set({
          envelope3: { attack, decay, sustain, release },
        })
        return true
      }
      break
    case 'env4':
    case 'envelope4':
      if (isarray(value)) {
        const [attack, decay, sustain, release] = value
        voice.source.synth.set({
          envelope4: { attack, decay, sustain, release },
        })
        return true
      }
      break
  }

  return false
}
