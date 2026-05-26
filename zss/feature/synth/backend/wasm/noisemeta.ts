import { SOURCE_TYPE } from 'zss/feature/synth/shared/sourcetype'

import {
  NOISE_BASE_EXPRESSION,
  WASM_NOISE_METALLIC_NORM,
  WASM_NOISE_SOFT_GAIN,
  WASM_NOISE_VOICE_GAIN,
} from './wasmlevels'

export type NOISE_META = {
  basepitch: number
  pitchfiltermult: number
  issoft: boolean
  expression: number
}

const NOISE_META_BY_TYPE: Partial<Record<SOURCE_TYPE, NOISE_META>> = {
  [SOURCE_TYPE.RETRO_NOISE]: {
    basepitch: 69,
    pitchfiltermult: 1024,
    issoft: false,
    expression: 0.25,
  },
  [SOURCE_TYPE.WHITE_NOISE]: {
    basepitch: 69,
    pitchfiltermult: 8.0,
    issoft: true,
    expression: 1.0,
  },
  [SOURCE_TYPE.CLANG_NOISE]: {
    basepitch: 69,
    pitchfiltermult: 1024,
    issoft: false,
    expression: 0.4,
  },
  [SOURCE_TYPE.BUZZ_NOISE]: {
    basepitch: 69,
    pitchfiltermult: 1024,
    issoft: false,
    expression: 0.3,
  },
  [SOURCE_TYPE.HOLLOW_NOISE]: {
    basepitch: 96,
    pitchfiltermult: 1.0,
    issoft: true,
    expression: 1.5,
  },
  [SOURCE_TYPE.METALLIC_NOISE]: {
    basepitch: 69,
    pitchfiltermult: 1024,
    issoft: false,
    expression: 0.4,
  },
}

export function noisemetafor(source: SOURCE_TYPE): NOISE_META {
  return (
    NOISE_META_BY_TYPE[source] ?? NOISE_META_BY_TYPE[SOURCE_TYPE.RETRO_NOISE]!
  )
}

export function isnoisevoice(source: SOURCE_TYPE): boolean {
  return (
    source === SOURCE_TYPE.RETRO_NOISE ||
    source === SOURCE_TYPE.BUZZ_NOISE ||
    source === SOURCE_TYPE.CLANG_NOISE ||
    source === SOURCE_TYPE.METALLIC_NOISE ||
    source === SOURCE_TYPE.HOLLOW_NOISE ||
    source === SOURCE_TYPE.WHITE_NOISE
  )
}

/** Injected into WASM voice play code. */
export const WASM_NOISE_META_CODE = `
var NOISE_BASE_EXPRESSION = ${NOISE_BASE_EXPRESSION};
var WASM_NOISE_VOICE_GAIN = ${WASM_NOISE_VOICE_GAIN};
var WASM_NOISE_SOFT_GAIN = ${WASM_NOISE_SOFT_GAIN};
var METALLIC_WAVE_NORM = ${WASM_NOISE_METALLIC_NORM};
var NOISE_META = {
  1: { basepitch: 69, pitchfiltermult: 1024, issoft: 0, expression: 0.25 },
  2: { basepitch: 69, pitchfiltermult: 1024, issoft: 0, expression: 0.3 },
  3: { basepitch: 69, pitchfiltermult: 1024, issoft: 0, expression: 0.4 },
  4: { basepitch: 69, pitchfiltermult: 1024, issoft: 0, expression: 0.4 },
  8: { basepitch: 96, pitchfiltermult: 1.0, issoft: 1, expression: 1.5 },
  9: { basepitch: 69, pitchfiltermult: 8.0, issoft: 1, expression: 1.0 }
};

function noisemetafor(kind) {
  return NOISE_META[kind] || NOISE_META[1];
}
`
