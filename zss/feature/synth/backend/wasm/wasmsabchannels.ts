import { SYNTH_VOICE_COUNT } from 'zss/feature/synth/synthdefaults'

/** Strides must match wasm*configsab.ts and wasmfxstate.ts (no imports — breaks sabpush cycle). */
const WASM_VOICE_CFG_STRIDE = 6
const WASM_OSC_CFG_STRIDE = 21
const WASM_ALGO_CFG_STRIDE = 26
const WASM_FX_GROUP_COUNT = 4
const WASM_FX_SEND_COUNT = 7
const WASM_FX_PARAM_COUNT = 20
const WASM_MASTER_SAB_LEN = 3

export const WASM_VOICES_SAB = 'zss_voices'
export const WASM_DRUMS_SAB = 'zss_drums'
export const WASM_VOICE_STRIDE = 6
export const WASM_DRUM_COUNT = 10
export const WASM_VOICE_SAB_LEN = SYNTH_VOICE_COUNT * WASM_VOICE_STRIDE
export const WASM_DRUM_SAB_LEN = WASM_DRUM_COUNT * 2
export const WASM_FX_SAB_LEN =
  WASM_FX_GROUP_COUNT * WASM_FX_SEND_COUNT +
  WASM_FX_GROUP_COUNT * WASM_FX_PARAM_COUNT
export const WASM_VOICE_CFG_SAB_LEN = SYNTH_VOICE_COUNT * WASM_VOICE_CFG_STRIDE
export const WASM_OSC_CFG_SAB_LEN = SYNTH_VOICE_COUNT * WASM_OSC_CFG_STRIDE
export const WASM_ALGO_CFG_SAB_LEN = SYNTH_VOICE_COUNT * WASM_ALGO_CFG_STRIDE

export type WASM_SAB_CHANNEL = {
  id: string
  len: number
}

/** All ZSS synth control channels mapped to worklet-side Float64Array views. */
export const WASM_SAB_CHANNELS: WASM_SAB_CHANNEL[] = [
  { id: WASM_VOICES_SAB, len: WASM_VOICE_SAB_LEN },
  { id: WASM_DRUMS_SAB, len: WASM_DRUM_SAB_LEN },
  { id: 'zss_master', len: WASM_MASTER_SAB_LEN },
  { id: 'zss_fx', len: WASM_FX_SAB_LEN },
  { id: 'zss_voicecfg', len: WASM_VOICE_CFG_SAB_LEN },
  { id: 'zss_osccfg', len: WASM_OSC_CFG_SAB_LEN },
  { id: 'zss_algocfg', len: WASM_ALGO_CFG_SAB_LEN },
]
