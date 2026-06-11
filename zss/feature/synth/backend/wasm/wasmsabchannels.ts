import { SYNTH_VOICE_COUNT } from 'zss/feature/synth/synthdefaults'

/** Strides must match daisycontrol.ts, zss_daisy_synth.cpp, and wasm*configsab.ts (no imports — breaks sabpush cycle). */
const WASM_VOICE_CFG_STRIDE = 10
const WASM_OSC_CFG_STRIDE = 21
const WASM_ALGO_CFG_STRIDE = 26
const WASM_FX_GROUP_COUNT = 4
const WASM_FX_SEND_COUNT = 7
const WASM_FX_PARAM_COUNT = 20
const WASM_MAIN_SAB_LEN = 5

export const WASM_VOICES_SAB = 'zss_voices'
export const WASM_DRUMS_SAB = 'zss_drums'
export const WASM_VOICE_STRIDE = 6
export const WASM_DRUM_COUNT = 12
export const WASM_VOICE_SAB_LEN = SYNTH_VOICE_COUNT * WASM_VOICE_STRIDE
export const WASM_DRUM_SAB_LEN = WASM_DRUM_COUNT * 2
export const WASM_FX_SAB_LEN =
  WASM_FX_GROUP_COUNT * WASM_FX_SEND_COUNT +
  WASM_FX_GROUP_COUNT * WASM_FX_PARAM_COUNT
export const WASM_VOICE_CFG_SAB_LEN = SYNTH_VOICE_COUNT * WASM_VOICE_CFG_STRIDE
export const WASM_OSC_CFG_SAB_LEN = SYNTH_VOICE_COUNT * WASM_OSC_CFG_STRIDE
export const WASM_ALGO_CFG_SAB_LEN = SYNTH_VOICE_COUNT * WASM_ALGO_CFG_STRIDE

export const WASM_SAB_SEQ = 'zss_sab_seq'
export const WASM_SAB_SEQ_LEN = 9

export const WASM_SAB_SEQ_IDX = {
  VOICES: 0,
  DRUMS: 1,
  MAIN: 2,
  FX: 3,
  VOICE_CFG: 4,
  OSC_CFG: 5,
  ALGO_CFG: 6,
  VIBRATO: 7,
} as const

export const WASM_VIBRATO_SAB = 'zss_vibrato'
export const WASM_VIBRATO_GROUP_COUNT = 3
export const WASM_VIBRATO_STRIDE = 4
export const WASM_VIBRATO_SAB_LEN =
  1 + WASM_VIBRATO_GROUP_COUNT * WASM_VIBRATO_STRIDE

/** Map data-channel id → seq slot (used by sabpush after each write). */
export const WASM_SAB_SEQ_CHANNEL_TO_IDX: Record<string, number> = {
  [WASM_VOICES_SAB]: WASM_SAB_SEQ_IDX.VOICES,
  [WASM_DRUMS_SAB]: WASM_SAB_SEQ_IDX.DRUMS,
  zss_main: WASM_SAB_SEQ_IDX.MAIN,
  zss_fx: WASM_SAB_SEQ_IDX.FX,
  zss_voicecfg: WASM_SAB_SEQ_IDX.VOICE_CFG,
  zss_osccfg: WASM_SAB_SEQ_IDX.OSC_CFG,
  zss_algocfg: WASM_SAB_SEQ_IDX.ALGO_CFG,
  [WASM_VIBRATO_SAB]: WASM_SAB_SEQ_IDX.VIBRATO,
}

export type WASM_SAB_CHANNEL = {
  id: string
  len: number
}

/** All ZSS synth control channels mapped to worklet-side Float64Array views. */
export const WASM_SAB_CHANNELS: WASM_SAB_CHANNEL[] = [
  { id: WASM_VOICES_SAB, len: WASM_VOICE_SAB_LEN },
  { id: WASM_DRUMS_SAB, len: WASM_DRUM_SAB_LEN },
  { id: 'zss_main', len: WASM_MAIN_SAB_LEN },
  { id: 'zss_fx', len: WASM_FX_SAB_LEN },
  { id: 'zss_voicecfg', len: WASM_VOICE_CFG_SAB_LEN },
  { id: 'zss_osccfg', len: WASM_OSC_CFG_SAB_LEN },
  { id: 'zss_algocfg', len: WASM_ALGO_CFG_SAB_LEN },
  { id: WASM_VIBRATO_SAB, len: WASM_VIBRATO_SAB_LEN },
]
