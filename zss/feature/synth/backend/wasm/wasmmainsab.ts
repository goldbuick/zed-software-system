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

/** CLI `#vol` main scale (0-100). Multiplies bus trims before SAB push. */
export const WASM_DEFAULT_MAIN_VOLUME = 50
/** CLI `#playvol` trim (0-100). */
export const WASM_DEFAULT_PLAY_VOLUME = 90
/** CLI `#bgvol` trim (0-100). */
export const WASM_DEFAULT_BGPLAY_VOLUME = 90
/** CLI `#ttsvol` trim (0-100). */
export const WASM_DEFAULT_TTS_VOLUME = 90

/** Apply main scale to a bus trim for SAB / HTMLMediaElement gain. */
export function effectivemainvolume(
  trim: number,
  main = WASM_DEFAULT_MAIN_VOLUME,
): number {
  return (trim * main) / 100
}

export function defaultwasmmainsab(): number[] {
  return [
    effectivemainvolume(WASM_DEFAULT_PLAY_VOLUME),
    effectivemainvolume(WASM_DEFAULT_BGPLAY_VOLUME),
    effectivemainvolume(WASM_DEFAULT_TTS_VOLUME),
    0,
    0,
  ]
}

export function pushwasmmainsab(maxi: SabEngine, sab: number[]) {
  pushwasmsabvalues(maxi, WASM_MAIN_SAB, sab)
}

export function initwasmmainsab(
  maxi: SabEngine,
  playvolume = effectivemainvolume(WASM_DEFAULT_PLAY_VOLUME),
  bgplayvolume = effectivemainvolume(WASM_DEFAULT_BGPLAY_VOLUME),
  ttsvolume = effectivemainvolume(WASM_DEFAULT_TTS_VOLUME),
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
