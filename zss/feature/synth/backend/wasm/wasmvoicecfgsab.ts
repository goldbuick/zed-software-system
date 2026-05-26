import { SYNTH_VOICE_COUNT } from 'zss/feature/synth/synthdefaults'

import type { MaxiEngine } from './maximilian'
import { pushwasmsabvalues } from './sabpush'
import type { WASM_VOICE_STATE } from './wasmvoiceconfig'

export const WASM_VOICE_CFG_SAB = 'zss_voicecfg'
export const WASM_VOICE_CFG_STRIDE = 6
export const WASM_VOICE_CFG_BLOCK = SYNTH_VOICE_COUNT * WASM_VOICE_CFG_STRIDE

/** Tone ZSS reset SYNTH envelope — matches zssenv(10, 10, 0.5, 10) in voiceplaycode. */
export const DEFAULT_WASM_ENVELOPE = {
  attack: 0.01,
  decay: 0.01,
  sustain: 0.5,
  release: 0.01,
} as const

export const DEFAULT_WASM_VOICE_VOLUME_DB = 0

export type WASM_VOICE_ENVELOPE = {
  attack: number
  decay: number
  sustain: number
  release: number
}

export function wasmvoicecfgtosab(voicestate: WASM_VOICE_STATE[]): number[] {
  const out = new Array(WASM_VOICE_CFG_BLOCK).fill(0)
  for (let i = 0; i < voicestate.length; i++) {
    const base = i * WASM_VOICE_CFG_STRIDE
    const env = voicestate[i].envelope
    out[base] = env.attack
    out[base + 1] = env.decay
    out[base + 2] = env.sustain
    out[base + 3] = env.release
    out[base + 4] = voicestate[i].portamento
    out[base + 5] = voicestate[i].volume
  }
  return out
}

export function initwasmvoicecfgsab(
  maxi: MaxiEngine,
  voicestate: WASM_VOICE_STATE[],
) {
  pushwasmvoicecfgsab(maxi, voicestate)
}

export function pushwasmvoicecfgsab(
  maxi: MaxiEngine,
  voicestate: WASM_VOICE_STATE[],
) {
  pushwasmsabvalues(maxi, WASM_VOICE_CFG_SAB, wasmvoicecfgtosab(voicestate))
}
