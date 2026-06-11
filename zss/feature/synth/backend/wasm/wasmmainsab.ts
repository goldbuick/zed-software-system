import type { SabEngine } from 'zss/feature/synth/backend/shared/sabengine'

import { pushwasmsabvalues } from './sabpush'

export const WASM_MAIN_SAB = 'zss_main'
export const WASM_MAIN_SAB_LEN = 5

export const WASM_MAIN_IDX = {
  PLAY: 0,
  BGPLAY: 1,
  TTS: 2,
  /** 1 = bypass main bus compressor (debug / offline A/B). */
  COMP_BYPASS: 3,
  /** 1 = bypass play-bus sidechain duck (debug / offline A/B). */
  SC_BYPASS: 4,
} as const

export const WASM_DEFAULT_PLAY_VOLUME = 80
export const WASM_DEFAULT_BGPLAY_VOLUME = 100
export const WASM_DEFAULT_TTS_VOLUME = 25

export function defaultwasmmainsab(): number[] {
  return [
    WASM_DEFAULT_PLAY_VOLUME,
    WASM_DEFAULT_BGPLAY_VOLUME,
    WASM_DEFAULT_TTS_VOLUME,
    0,
    0,
  ]
}

export function pushwasmmainsab(maxi: SabEngine, sab: number[]) {
  pushwasmsabvalues(maxi, WASM_MAIN_SAB, sab)
}

export function initwasmmainsab(
  maxi: SabEngine,
  playvolume = WASM_DEFAULT_PLAY_VOLUME,
  bgplayvolume = WASM_DEFAULT_BGPLAY_VOLUME,
  ttsvolume = WASM_DEFAULT_TTS_VOLUME,
  compbypass = 0,
  scbypass = 0,
) {
  pushwasmmainsab(maxi, [
    playvolume,
    bgplayvolume,
    ttsvolume,
    compbypass,
    scbypass,
  ])
}
