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
  DEFAULT_WASM_BOWED,
  DEFAULT_WASM_ENVELOPE,
  DEFAULT_WASM_GUITAR,
  DEFAULT_WASM_ORGAN,
  DEFAULT_WASM_PIANO,
  DEFAULT_WASM_PLUCK,
  DEFAULT_WASM_STRING_ENSEMBLE,
  DEFAULT_WASM_TIMPANI,
  DEFAULT_WASM_VOICE_VOLUME_DB,
  DEFAULT_WASM_WIND,
  type WASM_BOWED_PARAMS,
  type WASM_GUITAR_PARAMS,
  type WASM_ORGAN_PARAMS,
  type WASM_PIANO_PARAMS,
  type WASM_PLUCK_PARAMS,
  type WASM_STRING_ENSEMBLE_PARAMS,
  type WASM_TIMPANI_PARAMS,
  type WASM_VOICE_ENVELOPE,
  type WASM_WIND_PARAMS,
} from './wasmvoicecfgsab'

export type {
  WASM_VOICE_ENVELOPE,
  WASM_PLUCK_PARAMS,
  WASM_STRING_ENSEMBLE_PARAMS,
  WASM_WIND_PARAMS,
  WASM_PIANO_PARAMS,
  WASM_TIMPANI_PARAMS,
  WASM_BOWED_PARAMS,
  WASM_GUITAR_PARAMS,
  WASM_ORGAN_PARAMS,
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
  wind: WASM_WIND_PARAMS
  piano: WASM_PIANO_PARAMS
  timpani: WASM_TIMPANI_PARAMS
  bowed: WASM_BOWED_PARAMS
  guitar: WASM_GUITAR_PARAMS
  organ: WASM_ORGAN_PARAMS
}

function defaultpluck(): WASM_PLUCK_PARAMS {
  return { ...DEFAULT_WASM_PLUCK }
}

function defaultstringensemble(): WASM_STRING_ENSEMBLE_PARAMS {
  return { ...DEFAULT_WASM_STRING_ENSEMBLE }
}

function defaultwind(): WASM_WIND_PARAMS {
  return { ...DEFAULT_WASM_WIND }
}

function defaultpiano(): WASM_PIANO_PARAMS {
  return { ...DEFAULT_WASM_PIANO }
}

function defaulttimpani(): WASM_TIMPANI_PARAMS {
  return { ...DEFAULT_WASM_TIMPANI }
}

function defaultbowed(): WASM_BOWED_PARAMS {
  return { ...DEFAULT_WASM_BOWED }
}

function defaultguitar(): WASM_GUITAR_PARAMS {
  return { ...DEFAULT_WASM_GUITAR }
}

function defaultorgan(): WASM_ORGAN_PARAMS {
  return { ...DEFAULT_WASM_ORGAN }
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
    wind: defaultwind(),
    piano: defaultpiano(),
    timpani: defaulttimpani(),
    bowed: defaultbowed(),
    guitar: defaultguitar(),
    organ: defaultorgan(),
  }
}

export function defaultwasmvoicestate(): WASM_VOICE_STATE[] {
  return Array.from({ length: 8 }, () => defaultvoice())
}

function winddefaults(algo: number): WASM_WIND_PARAMS {
  if (algo === 1) {
    return { breath: 0.25, pressure: 0.35, brightness: 0.3, resonance: 0.2 }
  }
  if (algo === 2) {
    return { breath: 0.15, pressure: 0.65, brightness: 0.55, resonance: 0.35 }
  }
  if (algo === 3) {
    return { breath: 0.4, pressure: 0.25, brightness: 0.35, resonance: 0.08 }
  }
  return { breath: 0.35, pressure: 0.4, brightness: 0.45, resonance: 0.1 }
}

function windenvelope(algo: number): WASM_VOICE_ENVELOPE {
  if (algo === 1) {
    return { attack: 0.08, decay: 0.18, sustain: 0.8, release: 0.7 }
  }
  if (algo === 2) {
    return { attack: 0.04, decay: 0.12, sustain: 0.75, release: 0.5 }
  }
  if (algo === 3) {
    return { attack: 0.1, decay: 0.2, sustain: 0.85, release: 0.75 }
  }
  return { attack: 0.12, decay: 0.2, sustain: 0.85, release: 0.8 }
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

function iswindparamkey(key: string): boolean {
  return (
    key === 'breath' ||
    key === 'pressure' ||
    key === 'brightness' ||
    key === 'resonance'
  )
}

function ispianoparamkey(key: string): boolean {
  return (
    key === 'spread' ||
    key === 'hammer' ||
    key === 'brightness' ||
    key === 'damping'
  )
}

function istimpaniparamkey(key: string): boolean {
  return (
    key === 'tension' || key === 'decay' || key === 'tone' || key === 'strike'
  )
}

function isbowedparamkey(key: string): boolean {
  return key === 'bow' || key === 'pressure' || key === 'vib' || key === 'body'
}

function isguitarparamkey(key: string): boolean {
  return (
    key === 'pick' || key === 'body' || key === 'damping' || key === 'position'
  )
}

function isorganparamkey(key: string): boolean {
  return (
    key === 'drawbar' || key === 'click' || key === 'leak' || key === 'bright'
  )
}

function applynumericparam(
  target: Record<string, number>,
  key: string,
  value: number | string | number[],
): boolean {
  if (!isnumber(value)) {
    return false
  }
  if (key in target) {
    target[key] = value
    return true
  }
  return false
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
    case 'flute':
      return {
        ...current,
        type: SOURCE_TYPE.WIND_VOICE,
        algo: 0,
        wind: winddefaults(0),
        envelope: windenvelope(0),
      }
    case 'clarinet':
      return {
        ...current,
        type: SOURCE_TYPE.WIND_VOICE,
        algo: 1,
        wind: winddefaults(1),
        envelope: windenvelope(1),
      }
    case 'brass':
      return {
        ...current,
        type: SOURCE_TYPE.WIND_VOICE,
        algo: 2,
        wind: winddefaults(2),
        envelope: windenvelope(2),
      }
    case 'panpipe':
      return {
        ...current,
        type: SOURCE_TYPE.WIND_VOICE,
        algo: 3,
        wind: winddefaults(3),
        envelope: windenvelope(3),
      }
    case 'piano':
      return {
        ...current,
        type: SOURCE_TYPE.PIANO_VOICE,
        algo: 0,
        piano: defaultpiano(),
        envelope: { attack: 0.001, decay: 1.8, sustain: 0.25, release: 1.2 },
      }
    case 'epiano':
      return {
        ...current,
        type: SOURCE_TYPE.PIANO_VOICE,
        algo: 1,
        piano: { spread: 0.12, hammer: 0.25, brightness: 0.65, damping: 0.6 },
        envelope: { attack: 0.002, decay: 0.9, sustain: 0.15, release: 0.6 },
      }
    case 'timpani':
      return {
        ...current,
        type: SOURCE_TYPE.TIMPANI_VOICE,
        algo: 0,
        timpani: defaulttimpani(),
        envelope: { attack: 0.002, decay: 0.8, sustain: 0.05, release: 0.4 },
      }
    case 'violin':
      return {
        ...current,
        type: SOURCE_TYPE.BOWED_VOICE,
        algo: 0,
        bowed: { bow: 0.2, pressure: 0.5, vib: 0.4, body: 0.55 },
        envelope: { attack: 0.2, decay: 0.25, sustain: 0.9, release: 0.6 },
      }
    case 'viola':
      return {
        ...current,
        type: SOURCE_TYPE.BOWED_VOICE,
        algo: 1,
        bowed: { bow: 0.28, pressure: 0.45, vib: 0.3, body: 0.65 },
        envelope: { attack: 0.28, decay: 0.3, sustain: 0.88, release: 0.7 },
      }
    case 'nylon':
      return {
        ...current,
        type: SOURCE_TYPE.GUITAR_VOICE,
        algo: 0,
        guitar: { pick: 0.25, body: 0.4, damping: 0.55, position: 0.35 },
      }
    case 'steel':
      return {
        ...current,
        type: SOURCE_TYPE.GUITAR_VOICE,
        algo: 1,
        guitar: { pick: 0.5, body: 0.35, damping: 0.45, position: 0.6 },
      }
    case 'tonewheel':
      return {
        ...current,
        type: SOURCE_TYPE.ORGAN_VOICE,
        algo: 0,
        organ: defaultorgan(),
        envelope: { attack: 0.001, decay: 0.01, sustain: 1, release: 0.05 },
      }
    case 'drawbar':
      return {
        ...current,
        type: SOURCE_TYPE.ORGAN_VOICE,
        algo: 1,
        organ: defaultorgan(),
        envelope: { attack: 0.001, decay: 0.01, sustain: 1, release: 0.05 },
      }
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
          voice.type === SOURCE_TYPE.ALGO_SYNTH ||
          voice.type === SOURCE_TYPE.BOWED_VOICE
        ) {
          voice.portamento = value
          return true
        }
      }
      return false
  }

  if (isstring(config)) {
    const voice = voicestate[index]
    if (ispluckparamkey(config)) {
      if (voice.type === SOURCE_TYPE.STRING_VOICE && voice.algo === 1) {
        return applywasmpluckconfig(voice, config, value)
      }
      return false
    }
    if (isstringensembleparamkey(config)) {
      if (voice.type === SOURCE_TYPE.STRING_VOICE && voice.algo === 0) {
        return applywasmstringensembleconfig(voice, config, value)
      }
      return false
    }
    if (iswindparamkey(config)) {
      if (voice.type === SOURCE_TYPE.WIND_VOICE) {
        return applynumericparam(voice.wind, config, value)
      }
      return false
    }
    if (ispianoparamkey(config)) {
      if (voice.type === SOURCE_TYPE.PIANO_VOICE) {
        return applynumericparam(voice.piano, config, value)
      }
      return false
    }
    if (istimpaniparamkey(config)) {
      if (voice.type === SOURCE_TYPE.TIMPANI_VOICE) {
        return applynumericparam(voice.timpani, config, value)
      }
      return false
    }
    if (isbowedparamkey(config)) {
      if (voice.type === SOURCE_TYPE.BOWED_VOICE) {
        return applynumericparam(voice.bowed, config, value)
      }
      return false
    }
    if (isguitarparamkey(config)) {
      if (voice.type === SOURCE_TYPE.GUITAR_VOICE) {
        return applynumericparam(voice.guitar, config, value)
      }
      return false
    }
    if (isorganparamkey(config)) {
      if (voice.type === SOURCE_TYPE.ORGAN_VOICE) {
        return applynumericparam(voice.organ, config, value)
      }
      if (config !== 'drawbar') {
        return false
      }
    }
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
