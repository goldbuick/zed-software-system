import { SOURCE_TYPE } from 'zss/feature/synth/shared/sourcetype'
import { SYNTH_VOICE_COUNT } from 'zss/feature/synth/synthdefaults'

import type { SabEngine } from '../shared/sabengine'
import { pushwasmsabvalues } from './sabpush'
import type { WASM_VOICE_STATE } from './wasmvoiceconfig'

export const WASM_VOICE_CFG_SAB = 'zss_voicecfg'
/** Must match DAISY_VOICE_CFG_STRIDE / kVoiceCfgStride in zss_daisy_synth.cpp. */
export const WASM_VOICE_CFG_STRIDE = 10
export const WASM_VOICE_CFG_BLOCK = SYNTH_VOICE_COUNT * WASM_VOICE_CFG_STRIDE

/** Tone ZSS reset SYNTH envelope — matches zssenv(10, 10, 0.5, 10) in voiceplaycode. */
export const DEFAULT_WASM_ENVELOPE = {
  attack: 0.01,
  decay: 0.01,
  sustain: 0.5,
  release: 0.01,
} as const

export const DEFAULT_WASM_VOICE_VOLUME_DB = 0

export const DEFAULT_WASM_PLUCK = {
  structure: 0.14,
  brightness: 0.22,
  damping: 0.68,
  accent: 0.48,
} as const

/** SOS string-machine defaults (SAB slots 6–9 when STRING_VOICE algo 0). */
export const DEFAULT_WASM_STRING_ENSEMBLE = {
  detune: 0.25,
  pwm: 0.2,
  vib: 0.35,
  filter: 0.5,
} as const

export type WASM_VOICE_ENVELOPE = {
  attack: number
  decay: number
  sustain: number
  release: number
}

export type WASM_PLUCK_PARAMS = {
  structure: number
  brightness: number
  damping: number
  accent: number
}

export type WASM_STRING_ENSEMBLE_PARAMS = {
  detune: number
  pwm: number
  vib: number
  filter: number
}

export function wasmvoicecfgtosab(voicestate: WASM_VOICE_STATE[]): number[] {
  const out = new Array(WASM_VOICE_CFG_BLOCK).fill(0)
  for (let i = 0; i < voicestate.length; i++) {
    const base = i * WASM_VOICE_CFG_STRIDE
    const env = voicestate[i].envelope
    const voice = voicestate[i]
    out[base] = env.attack
    out[base + 1] = env.decay
    out[base + 2] = env.sustain
    out[base + 3] = env.release
    out[base + 4] = voice.portamento
    out[base + 5] = voice.volume
    // SAB slots 6–9: string ensemble (algo 0) or pluck timbre (algo 1); dormant on other types.
    if (voice.type === SOURCE_TYPE.STRING_VOICE && voice.algo === 0) {
      const stringens = voice.stringensemble
      out[base + 6] = stringens.detune
      out[base + 7] = stringens.pwm
      out[base + 8] = stringens.vib
      out[base + 9] = stringens.filter
    } else {
      const pluck = voice.pluck
      out[base + 6] = pluck.structure
      out[base + 7] = pluck.brightness
      out[base + 8] = pluck.damping
      out[base + 9] = pluck.accent
    }
  }
  return out
}

export function initwasmvoicecfgsab(
  maxi: SabEngine,
  voicestate: WASM_VOICE_STATE[],
) {
  pushwasmvoicecfgsab(maxi, voicestate)
}

export function pushwasmvoicecfgsab(
  maxi: SabEngine,
  voicestate: WASM_VOICE_STATE[],
) {
  pushwasmsabvalues(maxi, WASM_VOICE_CFG_SAB, wasmvoicecfgtosab(voicestate))
}
