import type { SabEngine } from '../shared/sabengine'

import { pushwasmsabvalues } from './sabpush'

export const WASM_MASTER_SAB = 'zss_master'
export const WASM_MASTER_SAB_LEN = 4

export const WASM_MASTER_IDX = {
  PLAY: 0,
  BGPLAY: 1,
  TTS: 2,
  /** 1 = bypass main bus compressor (debug / offline A/B). */
  COMP_BYPASS: 3,
} as const

export const WASM_DEFAULT_PLAY_VOLUME = 80
export const WASM_DEFAULT_BGPLAY_VOLUME = 100
export const WASM_DEFAULT_TTS_VOLUME = 25

export function defaultwasmmastersab(): number[] {
  return [
    WASM_DEFAULT_PLAY_VOLUME,
    WASM_DEFAULT_BGPLAY_VOLUME,
    WASM_DEFAULT_TTS_VOLUME,
    0,
  ]
}

export function pushwasmmastersab(maxi: SabEngine, sab: number[]) {
  pushwasmsabvalues(maxi, WASM_MASTER_SAB, sab)
}

export function initwasmmastersab(
  maxi: SabEngine,
  playvolume = WASM_DEFAULT_PLAY_VOLUME,
  bgplayvolume = WASM_DEFAULT_BGPLAY_VOLUME,
  ttsvolume = WASM_DEFAULT_TTS_VOLUME,
  compbypass = 0,
) {
  pushwasmmastersab(maxi, [playvolume, bgplayvolume, ttsvolume, compbypass])
}
