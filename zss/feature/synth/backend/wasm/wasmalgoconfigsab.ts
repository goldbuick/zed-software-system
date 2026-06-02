import { SYNTH_VOICE_COUNT } from 'zss/feature/synth/synthdefaults'

import type { SabEngine } from '../shared/sabengine'

import { pushwasmsabvalues } from './sabpush'
import { WASM_OSC_TYPE, parsewasmosc } from './wasmosctype'

export const WASM_ALGO_CFG_SAB = 'zss_algocfg'
export const WASM_ALGO_CFG_STRIDE = 26
export const WASM_ALGO_CFG_BLOCK = SYNTH_VOICE_COUNT * WASM_ALGO_CFG_STRIDE

export const WASM_ALGO_CFG_IDX = {
  HARMONICITY1: 0,
  HARMONICITY2: 1,
  HARMONICITY3: 2,
  MODINDEX1: 3,
  MODINDEX2: 4,
  MODINDEX3: 5,
  OSC1: 6,
  OSC2: 7,
  OSC3: 8,
  OSC4: 9,
  ENV1_ATTACK: 10,
  ENV1_DECAY: 11,
  ENV1_SUSTAIN: 12,
  ENV1_RELEASE: 13,
  ENV2_ATTACK: 14,
  ENV2_DECAY: 15,
  ENV2_SUSTAIN: 16,
  ENV2_RELEASE: 17,
  ENV3_ATTACK: 18,
  ENV3_DECAY: 19,
  ENV3_SUSTAIN: 20,
  ENV3_RELEASE: 21,
  ENV4_ATTACK: 22,
  ENV4_DECAY: 23,
  ENV4_SUSTAIN: 24,
  ENV4_RELEASE: 25,
} as const

export type WASM_ALGO_ENVELOPE = {
  attack: number
  decay: number
  sustain: number
  release: number
}

export type WASM_ALGO_CONFIG = {
  harmonicity1: number
  harmonicity2: number
  harmonicity3: number
  modindex1: number
  modindex2: number
  modindex3: number
  osc1: WASM_OSC_TYPE
  osc2: WASM_OSC_TYPE
  osc3: WASM_OSC_TYPE
  osc4: WASM_OSC_TYPE
  env1: WASM_ALGO_ENVELOPE
  env2: WASM_ALGO_ENVELOPE
  env3: WASM_ALGO_ENVELOPE
  env4: WASM_ALGO_ENVELOPE
}

const DEFAULT_ALGO_ENV: WASM_ALGO_ENVELOPE = {
  attack: 0.01,
  decay: 0.01,
  sustain: 1,
  release: 0.5,
}

export const DEFAULT_WASM_ALGO_CONFIG: WASM_ALGO_CONFIG = {
  harmonicity1: 2,
  harmonicity2: 2,
  harmonicity3: 2,
  modindex1: 1,
  modindex2: 1,
  modindex3: 1,
  osc1: WASM_OSC_TYPE.SINE,
  osc2: WASM_OSC_TYPE.SINE,
  osc3: WASM_OSC_TYPE.SINE,
  osc4: WASM_OSC_TYPE.SINE,
  env1: { ...DEFAULT_ALGO_ENV },
  env2: { ...DEFAULT_ALGO_ENV },
  env3: { ...DEFAULT_ALGO_ENV },
  env4: { ...DEFAULT_ALGO_ENV },
}

export function defaultwasmalgoconfig(): WASM_ALGO_CONFIG[] {
  return Array.from({ length: SYNTH_VOICE_COUNT }, () => ({
    ...DEFAULT_WASM_ALGO_CONFIG,
    env1: { ...DEFAULT_ALGO_ENV },
    env2: { ...DEFAULT_ALGO_ENV },
    env3: { ...DEFAULT_ALGO_ENV },
    env4: { ...DEFAULT_ALGO_ENV },
  }))
}

export function parsealgowaveconfig(value: string): WASM_OSC_TYPE | undefined {
  return parsewasmosc(value)
}

export function wasmalgoconfigtosab(config: WASM_ALGO_CONFIG[]): number[] {
  const out = new Array(WASM_ALGO_CFG_BLOCK).fill(0)
  for (let i = 0; i < config.length; i++) {
    const base = i * WASM_ALGO_CFG_STRIDE
    const cfg = config[i]
    out[base + WASM_ALGO_CFG_IDX.HARMONICITY1] = cfg.harmonicity1
    out[base + WASM_ALGO_CFG_IDX.HARMONICITY2] = cfg.harmonicity2
    out[base + WASM_ALGO_CFG_IDX.HARMONICITY3] = cfg.harmonicity3
    out[base + WASM_ALGO_CFG_IDX.MODINDEX1] = cfg.modindex1
    out[base + WASM_ALGO_CFG_IDX.MODINDEX2] = cfg.modindex2
    out[base + WASM_ALGO_CFG_IDX.MODINDEX3] = cfg.modindex3
    out[base + WASM_ALGO_CFG_IDX.OSC1] = cfg.osc1
    out[base + WASM_ALGO_CFG_IDX.OSC2] = cfg.osc2
    out[base + WASM_ALGO_CFG_IDX.OSC3] = cfg.osc3
    out[base + WASM_ALGO_CFG_IDX.OSC4] = cfg.osc4
    out[base + WASM_ALGO_CFG_IDX.ENV1_ATTACK] = cfg.env1.attack
    out[base + WASM_ALGO_CFG_IDX.ENV1_DECAY] = cfg.env1.decay
    out[base + WASM_ALGO_CFG_IDX.ENV1_SUSTAIN] = cfg.env1.sustain
    out[base + WASM_ALGO_CFG_IDX.ENV1_RELEASE] = cfg.env1.release
    out[base + WASM_ALGO_CFG_IDX.ENV2_ATTACK] = cfg.env2.attack
    out[base + WASM_ALGO_CFG_IDX.ENV2_DECAY] = cfg.env2.decay
    out[base + WASM_ALGO_CFG_IDX.ENV2_SUSTAIN] = cfg.env2.sustain
    out[base + WASM_ALGO_CFG_IDX.ENV2_RELEASE] = cfg.env2.release
    out[base + WASM_ALGO_CFG_IDX.ENV3_ATTACK] = cfg.env3.attack
    out[base + WASM_ALGO_CFG_IDX.ENV3_DECAY] = cfg.env3.decay
    out[base + WASM_ALGO_CFG_IDX.ENV3_SUSTAIN] = cfg.env3.sustain
    out[base + WASM_ALGO_CFG_IDX.ENV3_RELEASE] = cfg.env3.release
    out[base + WASM_ALGO_CFG_IDX.ENV4_ATTACK] = cfg.env4.attack
    out[base + WASM_ALGO_CFG_IDX.ENV4_DECAY] = cfg.env4.decay
    out[base + WASM_ALGO_CFG_IDX.ENV4_SUSTAIN] = cfg.env4.sustain
    out[base + WASM_ALGO_CFG_IDX.ENV4_RELEASE] = cfg.env4.release
  }
  return out
}

export function initwasmalgoconfigsab(
  maxi: SabEngine,
  config?: WASM_ALGO_CONFIG[],
) {
  pushwasmalgoconfigsab(maxi, config ?? defaultwasmalgoconfig())
}

export function pushwasmalgoconfigsab(
  maxi: SabEngine,
  config: WASM_ALGO_CONFIG[],
) {
  pushwasmsabvalues(maxi, WASM_ALGO_CFG_SAB, wasmalgoconfigtosab(config))
}
