import { SOURCE_TYPE } from 'zss/feature/synth/source'
import { validatesynthtype } from 'zss/feature/synth/voiceconfig/validation'
import { isstring } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { WASM_OSC_TYPE, parsewasmosc } from './wasmosctype'

export type WASM_VOICE_STATE = {
  type: SOURCE_TYPE
  algo: number
  osc: WASM_OSC_TYPE
}

export function defaultwasmvoicestate(): WASM_VOICE_STATE[] {
  return Array.from({ length: 8 }, () => ({
    type: SOURCE_TYPE.SYNTH,
    algo: 0,
    osc: WASM_OSC_TYPE.SQUARE,
  }))
}

function parsesourcetype(config: string): WASM_VOICE_STATE | undefined {
  const type = NAME(config)
  switch (type) {
    case 'retro':
      return { type: SOURCE_TYPE.RETRO_NOISE, algo: 0, osc: WASM_OSC_TYPE.SQUARE }
    case 'buzz':
      return { type: SOURCE_TYPE.BUZZ_NOISE, algo: 0, osc: WASM_OSC_TYPE.SQUARE }
    case 'clang':
      return { type: SOURCE_TYPE.CLANG_NOISE, algo: 0, osc: WASM_OSC_TYPE.SQUARE }
    case 'metallic':
      return {
        type: SOURCE_TYPE.METALLIC_NOISE,
        algo: 0,
        osc: WASM_OSC_TYPE.SQUARE,
      }
    case 'bells':
      return { type: SOURCE_TYPE.BELLS, algo: 0, osc: WASM_OSC_TYPE.SQUARE }
    case 'doot':
      return { type: SOURCE_TYPE.DOOT, algo: 0, osc: WASM_OSC_TYPE.SQUARE }
    case 'algo0':
      return { type: SOURCE_TYPE.ALGO_SYNTH, algo: 0, osc: WASM_OSC_TYPE.SQUARE }
    case 'algo1':
      return { type: SOURCE_TYPE.ALGO_SYNTH, algo: 1, osc: WASM_OSC_TYPE.SQUARE }
    case 'algo2':
      return { type: SOURCE_TYPE.ALGO_SYNTH, algo: 2, osc: WASM_OSC_TYPE.SQUARE }
    case 'algo3':
      return { type: SOURCE_TYPE.ALGO_SYNTH, algo: 3, osc: WASM_OSC_TYPE.SQUARE }
    case 'algo4':
      return { type: SOURCE_TYPE.ALGO_SYNTH, algo: 4, osc: WASM_OSC_TYPE.SQUARE }
    case 'algo5':
      return { type: SOURCE_TYPE.ALGO_SYNTH, algo: 5, osc: WASM_OSC_TYPE.SQUARE }
    case 'algo6':
      return { type: SOURCE_TYPE.ALGO_SYNTH, algo: 6, osc: WASM_OSC_TYPE.SQUARE }
    case 'algo7':
      return { type: SOURCE_TYPE.ALGO_SYNTH, algo: 7, osc: WASM_OSC_TYPE.SQUARE }
    default:
      return undefined
  }
}

export function applywasmvoiceconfig(
  voicestate: WASM_VOICE_STATE[],
  index: number,
  config: number | string,
  value: number | string | number[],
): boolean {
  if (index < 0 || index >= voicestate.length) {
    return false
  }

  if (config === 'restart') {
    voicestate.splice(0, voicestate.length, ...defaultwasmvoicestate())
    return true
  }

  if (isstring(config) && validatesynthtype(config, value)) {
    const source = parsesourcetype(config)
    if (source) {
      voicestate[index] = source
      return true
    }

    const osc = parsewasmosc(config)
    if (osc !== undefined) {
      voicestate[index] = {
        type: SOURCE_TYPE.SYNTH,
        algo: 0,
        osc,
      }
      return true
    }
  }

  return false
}

export function wasmvoicestatetosab(
  voicestate: WASM_VOICE_STATE[],
  playstate: number[],
  stride: number,
): number[] {
  const out = playstate.slice()
  for (let i = 0; i < voicestate.length; i++) {
    const base = i * stride
    out[base + 2] = voicestate[i].type
    out[base + 3] = voicestate[i].algo
    out[base + 5] = voicestate[i].osc
  }
  return out
}
