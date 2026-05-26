import { SOURCE_TYPE } from 'zss/feature/synth/source'
import { validatesynthtype } from 'zss/feature/synth/voiceconfig/validation'
import { isarray, isnumber, isstring } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { applywasmalgoconfig, resetwasmalgoconfig } from './wasmalgoconfig'
import type { WASM_ALGO_CONFIG } from './wasmalgoconfigsab'
import { applywasmoscconfig, resetwasmoscconfig } from './wasmoscconfig'
import type { WASM_OSC_CONFIG } from './wasmoscconfigsab'
import { WASM_OSC_TYPE, parsewasmosc } from './wasmosctype'
import {
  DEFAULT_WASM_ENVELOPE,
  type WASM_VOICE_ENVELOPE,
} from './wasmvoicecfgsab'

export type { WASM_VOICE_ENVELOPE } from './wasmvoicecfgsab'

export type WASM_VOICE_STATE = {
  type: SOURCE_TYPE
  algo: number
  osc: WASM_OSC_TYPE
  envelope: WASM_VOICE_ENVELOPE
  portamento: number
}

function defaultvoice(): WASM_VOICE_STATE {
  return {
    type: SOURCE_TYPE.SYNTH,
    algo: 0,
    osc: WASM_OSC_TYPE.SQUARE,
    envelope: { ...DEFAULT_WASM_ENVELOPE },
    portamento: 0,
  }
}

export function defaultwasmvoicestate(): WASM_VOICE_STATE[] {
  return Array.from({ length: 8 }, () => defaultvoice())
}

function parsesourcetype(
  config: string,
  current: WASM_VOICE_STATE,
): WASM_VOICE_STATE | undefined {
  const type = NAME(config)
  switch (type) {
    case 'retro':
      return {
        ...current,
        type: SOURCE_TYPE.RETRO_NOISE,
        algo: 0,
      }
    case 'buzz':
      return {
        ...current,
        type: SOURCE_TYPE.BUZZ_NOISE,
        algo: 0,
      }
    case 'clang':
      return {
        ...current,
        type: SOURCE_TYPE.CLANG_NOISE,
        algo: 0,
      }
    case 'metallic':
      return {
        ...current,
        type: SOURCE_TYPE.METALLIC_NOISE,
        algo: 0,
      }
    case 'noise':
      return {
        ...current,
        type: SOURCE_TYPE.WHITE_NOISE,
        algo: 0,
      }
    case 'hollow':
      return {
        ...current,
        type: SOURCE_TYPE.HOLLOW_NOISE,
        algo: 0,
      }
    case 'bells':
      return { ...current, type: SOURCE_TYPE.BELLS, algo: 0 }
    case 'doot':
      return { ...current, type: SOURCE_TYPE.DOOT, algo: 0 }
    case 'algo0':
      return { ...current, type: SOURCE_TYPE.ALGO_SYNTH, algo: 0 }
    case 'algo1':
      return { ...current, type: SOURCE_TYPE.ALGO_SYNTH, algo: 1 }
    case 'algo2':
      return { ...current, type: SOURCE_TYPE.ALGO_SYNTH, algo: 2 }
    case 'algo3':
      return { ...current, type: SOURCE_TYPE.ALGO_SYNTH, algo: 3 }
    case 'algo4':
      return { ...current, type: SOURCE_TYPE.ALGO_SYNTH, algo: 4 }
    case 'algo5':
      return { ...current, type: SOURCE_TYPE.ALGO_SYNTH, algo: 5 }
    case 'algo6':
      return { ...current, type: SOURCE_TYPE.ALGO_SYNTH, algo: 6 }
    case 'algo7':
      return { ...current, type: SOURCE_TYPE.ALGO_SYNTH, algo: 7 }
    default:
      return undefined
  }
}

export function applywasmvoiceconfig(
  voicestate: WASM_VOICE_STATE[],
  oscconfig: WASM_OSC_CONFIG[],
  algoconfig: WASM_ALGO_CONFIG[],
  index: number,
  config: number | string,
  value: number | string | number[],
): boolean {
  if (index < 0 || index >= voicestate.length) {
    return false
  }

  if (config === 'restart') {
    voicestate.splice(0, voicestate.length, ...defaultwasmvoicestate())
    resetwasmoscconfig(oscconfig)
    resetwasmalgoconfig(algoconfig)
    return true
  }

  switch (config) {
    case 'env':
    case 'envelope':
      if (isarray(value) && value.length >= 4) {
        const [attack, decay, sustain, release] = value
        if (
          isnumber(attack) &&
          isnumber(decay) &&
          isnumber(sustain) &&
          isnumber(release)
        ) {
          voicestate[index].envelope = { attack, decay, sustain, release }
          return true
        }
      }
      return false
    case 'port':
    case 'portamento':
      if (isnumber(value)) {
        const voice = voicestate[index]
        if (
          voice.type === SOURCE_TYPE.SYNTH ||
          voice.type === SOURCE_TYPE.ALGO_SYNTH
        ) {
          voice.portamento = value
          return true
        }
      }
      return false
  }

  if (isstring(config)) {
    if (voicestate[index].type === SOURCE_TYPE.ALGO_SYNTH) {
      if (applywasmalgoconfig(algoconfig, index, config, value)) {
        return true
      }
    }
    if (voicestate[index].type === SOURCE_TYPE.SYNTH) {
      if (applywasmoscconfig(oscconfig, index, config, value)) {
        return true
      }
    }
  }

  if (isstring(config) && validatesynthtype(config, value)) {
    const source = parsesourcetype(config, voicestate[index])
    if (source) {
      voicestate[index] = source
      return true
    }

    const osc = parsewasmosc(config)
    if (osc !== undefined) {
      voicestate[index] = {
        ...voicestate[index],
        type: SOURCE_TYPE.SYNTH,
        algo: 0,
        osc,
      }
      if (isarray(value) || isnumber(value)) {
        applywasmoscconfig(oscconfig, index, config, value)
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
