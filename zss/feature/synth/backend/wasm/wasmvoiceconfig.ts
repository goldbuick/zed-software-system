import { SOURCE_TYPE } from 'zss/feature/synth/shared/sourcetype'
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
  DEFAULT_WASM_PLUCK,
  DEFAULT_WASM_STRING_ENSEMBLE,
  DEFAULT_WASM_VOICE_VOLUME_DB,
  type WASM_PLUCK_PARAMS,
  type WASM_STRING_ENSEMBLE_PARAMS,
  type WASM_VOICE_ENVELOPE,
} from './wasmvoicecfgsab'

export type {
  WASM_VOICE_ENVELOPE,
  WASM_PLUCK_PARAMS,
  WASM_STRING_ENSEMBLE_PARAMS,
} from './wasmvoicecfgsab'

export type WASM_VOICE_STATE = {
  type: SOURCE_TYPE
  algo: number
  osc: WASM_OSC_TYPE
  envelope: WASM_VOICE_ENVELOPE
  portamento: number
  volume: number
  pluck: WASM_PLUCK_PARAMS
  stringensemble: WASM_STRING_ENSEMBLE_PARAMS
}

function defaultpluck(): WASM_PLUCK_PARAMS {
  return { ...DEFAULT_WASM_PLUCK }
}

function defaultstringensemble(): WASM_STRING_ENSEMBLE_PARAMS {
  return { ...DEFAULT_WASM_STRING_ENSEMBLE }
}

function defaultvoice(): WASM_VOICE_STATE {
  return {
    type: SOURCE_TYPE.SYNTH,
    algo: 0,
    osc: WASM_OSC_TYPE.SQUARE,
    envelope: { ...DEFAULT_WASM_ENVELOPE },
    portamento: 0,
    volume: DEFAULT_WASM_VOICE_VOLUME_DB,
    pluck: defaultpluck(),
    stringensemble: defaultstringensemble(),
  }
}

export function defaultwasmvoicestate(): WASM_VOICE_STATE[] {
  return Array.from({ length: 8 }, () => defaultvoice())
}

function ispluckparamkey(key: string): boolean {
  return (
    key === 'structure' ||
    key === 'brightness' ||
    key === 'damping' ||
    key === 'accent'
  )
}

function isstringensembleparamkey(key: string): boolean {
  return key === 'detune' || key === 'pwm' || key === 'vib' || key === 'filter'
}

function applywasmpluckconfig(
  voice: WASM_VOICE_STATE,
  key: string,
  value: number | string | number[],
): boolean {
  if (!isnumber(value)) {
    return false
  }
  switch (key) {
    case 'structure':
      voice.pluck.structure = value
      return true
    case 'brightness':
      voice.pluck.brightness = value
      return true
    case 'damping':
      voice.pluck.damping = value
      return true
    case 'accent':
      voice.pluck.accent = value
      return true
    default:
      return false
  }
}

function applywasmstringensembleconfig(
  voice: WASM_VOICE_STATE,
  key: string,
  value: number | string | number[],
): boolean {
  if (!isnumber(value)) {
    return false
  }
  switch (key) {
    case 'detune':
      voice.stringensemble.detune = value
      return true
    case 'pwm':
      voice.stringensemble.pwm = value
      return true
    case 'vib':
      voice.stringensemble.vib = value
      return true
    case 'filter':
      voice.stringensemble.filter = value
      return true
    default:
      return false
  }
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
    case 'string':
      return {
        ...current,
        type: SOURCE_TYPE.STRING_VOICE,
        algo: 0,
        stringensemble: defaultstringensemble(),
        envelope: { attack: 0.6, decay: 0.15, sustain: 0.88, release: 1.0 },
      }
    case 'pluck':
      return {
        ...current,
        type: SOURCE_TYPE.STRING_VOICE,
        algo: 1,
        pluck: defaultpluck(),
      }
    case 'drip':
      return { ...current, type: SOURCE_TYPE.DRIP_VOICE, algo: 0 }
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
    case 'vol':
    case 'volume':
      if (isnumber(value)) {
        voicestate[index].volume = value
        return true
      }
      return false
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
    if (ispluckparamkey(config)) {
      const voice = voicestate[index]
      if (voice.type === SOURCE_TYPE.STRING_VOICE && voice.algo === 1) {
        return applywasmpluckconfig(voice, config, value)
      }
      return false
    }
    if (isstringensembleparamkey(config)) {
      const voice = voicestate[index]
      if (voice.type === SOURCE_TYPE.STRING_VOICE && voice.algo === 0) {
        return applywasmstringensembleconfig(voice, config, value)
      }
      return false
    }
    const voice = voicestate[index]
    if (voice.type === SOURCE_TYPE.ALGO_SYNTH) {
      if (applywasmalgoconfig(algoconfig, index, config, value)) {
        return true
      }
    }
    if (voice.type === SOURCE_TYPE.SYNTH) {
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
