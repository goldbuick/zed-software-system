import { SYNTH_VOICE_COUNT } from 'zss/feature/synth/synthdefaults'

import type { SabEngine } from '../shared/sabengine'
import { pushwasmsabvalues } from './sabpush'

export const WASM_OSC_CFG_SAB = 'zss_osccfg'
export const WASM_OSC_CFG_STRIDE = 21
export const WASM_OSC_CFG_BLOCK = SYNTH_VOICE_COUNT * WASM_OSC_CFG_STRIDE

export const WASM_OSC_CFG_IDX = {
  PHASE: 0,
  WIDTH: 1,
  MODFREQ: 2,
  HARMONICITY: 3,
  MODINDEX: 4,
  COUNT: 5,
  SPREAD: 6,
  PARTIALCOUNT: 7,
  PARTIAL0: 8,
  PARTIAL1: 9,
  PARTIAL2: 10,
  PARTIAL3: 11,
  PARTIAL4: 12,
  PARTIAL5: 13,
  PARTIAL6: 14,
  PARTIAL7: 15,
  MODENV_ATTACK: 16,
  MODENV_DECAY: 17,
  MODENV_SUSTAIN: 18,
  MODENV_RELEASE: 19,
  MODTYPE: 20,
} as const

export type WASM_OSC_CONFIG = {
  phase: number
  width: number
  modfreq: number
  harmonicity: number
  modindex: number
  count: number
  spread: number
  partialcount: number
  partials: number[]
  modenv: { attack: number; decay: number; sustain: number; release: number }
  modtype: number
}

export const DEFAULT_WASM_OSC_CONFIG: WASM_OSC_CONFIG = {
  phase: 0,
  width: 0.2,
  modfreq: 1,
  harmonicity: 1,
  modindex: 2,
  count: 3,
  spread: 20,
  partialcount: 0,
  partials: [0, 0, 0, 0, 0, 0, 0, 0],
  modenv: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
  modtype: 0,
}

export function defaultwasmoscconfig(): WASM_OSC_CONFIG[] {
  return Array.from({ length: SYNTH_VOICE_COUNT }, () => ({
    ...DEFAULT_WASM_OSC_CONFIG,
    partials: [...DEFAULT_WASM_OSC_CONFIG.partials],
    modenv: { ...DEFAULT_WASM_OSC_CONFIG.modenv },
    modtype: DEFAULT_WASM_OSC_CONFIG.modtype,
  }))
}

export function wasmoscconfigtosab(config: WASM_OSC_CONFIG[]): number[] {
  const out = new Array(WASM_OSC_CFG_BLOCK).fill(0)
  for (let i = 0; i < config.length; i++) {
    const base = i * WASM_OSC_CFG_STRIDE
    const cfg = config[i]
    out[base + WASM_OSC_CFG_IDX.PHASE] = cfg.phase
    out[base + WASM_OSC_CFG_IDX.WIDTH] = cfg.width
    out[base + WASM_OSC_CFG_IDX.MODFREQ] = cfg.modfreq
    out[base + WASM_OSC_CFG_IDX.HARMONICITY] = cfg.harmonicity
    out[base + WASM_OSC_CFG_IDX.MODINDEX] = cfg.modindex
    out[base + WASM_OSC_CFG_IDX.COUNT] = cfg.count
    out[base + WASM_OSC_CFG_IDX.SPREAD] = cfg.spread
    out[base + WASM_OSC_CFG_IDX.PARTIALCOUNT] = cfg.partialcount
    for (let p = 0; p < 8; p++) {
      out[base + WASM_OSC_CFG_IDX.PARTIAL0 + p] = cfg.partials[p] ?? 0
    }
    out[base + WASM_OSC_CFG_IDX.MODENV_ATTACK] = cfg.modenv.attack
    out[base + WASM_OSC_CFG_IDX.MODENV_DECAY] = cfg.modenv.decay
    out[base + WASM_OSC_CFG_IDX.MODENV_SUSTAIN] = cfg.modenv.sustain
    out[base + WASM_OSC_CFG_IDX.MODENV_RELEASE] = cfg.modenv.release
    out[base + WASM_OSC_CFG_IDX.MODTYPE] = cfg.modtype
  }
  return out
}

export function initwasmoscconfigsab(
  maxi: SabEngine,
  config?: WASM_OSC_CONFIG[],
) {
  pushwasmoscconfigsab(maxi, config ?? defaultwasmoscconfig())
}

export function pushwasmoscconfigsab(
  maxi: SabEngine,
  config: WASM_OSC_CONFIG[],
) {
  pushwasmsabvalues(maxi, WASM_OSC_CFG_SAB, wasmoscconfigtosab(config))
}
