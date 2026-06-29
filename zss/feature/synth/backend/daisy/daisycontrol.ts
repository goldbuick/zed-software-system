/** Control buffer layout — must match zss_daisy_synth.cpp offsets and wasmsabchannels.ts. */
export const DAISY_VOICE_COUNT = 8
export const DAISY_VOICE_STRIDE = 6
export const DAISY_DRUM_COUNT = 12
export const DAISY_FX_GROUP_COUNT = 4
export const DAISY_FX_SEND_COUNT = 7
export const DAISY_FX_PARAM_COUNT = 20
/** Voice cfg slots 0–5: ADSR, portamento, volume; 6–9: pluck or string ensemble params. */
export const DAISY_VOICE_CFG_STRIDE = 10
export const DAISY_OSC_CFG_STRIDE = 21
export const DAISY_ALGO_CFG_STRIDE = 26
export const DAISY_VIBRATO_STRIDE = 4

const DAISY_VOICES_LEN = DAISY_VOICE_COUNT * DAISY_VOICE_STRIDE
const DAISY_DRUMS_LEN = DAISY_DRUM_COUNT * 2
const DAISY_MAIN_LEN = 5
const DAISY_FX_LEN =
  DAISY_FX_GROUP_COUNT * DAISY_FX_SEND_COUNT +
  DAISY_FX_GROUP_COUNT * DAISY_FX_PARAM_COUNT
const DAISY_VOICE_CFG_LEN = DAISY_VOICE_COUNT * DAISY_VOICE_CFG_STRIDE
const DAISY_OSC_CFG_LEN = DAISY_VOICE_COUNT * DAISY_OSC_CFG_STRIDE
const DAISY_ALGO_CFG_LEN = DAISY_VOICE_COUNT * DAISY_ALGO_CFG_STRIDE
const DAISY_VIBRATO_LEN = 1 + 3 * DAISY_VIBRATO_STRIDE

export const DAISY_CONTROL_LEN =
  DAISY_VOICES_LEN +
  DAISY_DRUMS_LEN +
  DAISY_MAIN_LEN +
  DAISY_FX_LEN +
  DAISY_VOICE_CFG_LEN +
  DAISY_OSC_CFG_LEN +
  DAISY_ALGO_CFG_LEN +
  DAISY_VIBRATO_LEN

/** SAB channel id → offset in flat control buffer (doubles). */
export const DAISY_SAB_CHANNEL_OFFSET: Record<string, number> = {
  zss_voices: 0,
  zss_drums: DAISY_VOICES_LEN,
  zss_main: DAISY_VOICES_LEN + DAISY_DRUMS_LEN,
  zss_fx: DAISY_VOICES_LEN + DAISY_DRUMS_LEN + DAISY_MAIN_LEN,
  zss_voicecfg:
    DAISY_VOICES_LEN + DAISY_DRUMS_LEN + DAISY_MAIN_LEN + DAISY_FX_LEN,
  zss_osccfg:
    DAISY_VOICES_LEN +
    DAISY_DRUMS_LEN +
    DAISY_MAIN_LEN +
    DAISY_FX_LEN +
    DAISY_VOICE_CFG_LEN,
  zss_algocfg:
    DAISY_VOICES_LEN +
    DAISY_DRUMS_LEN +
    DAISY_MAIN_LEN +
    DAISY_FX_LEN +
    DAISY_VOICE_CFG_LEN +
    DAISY_OSC_CFG_LEN,
  zss_vibrato:
    DAISY_VOICES_LEN +
    DAISY_DRUMS_LEN +
    DAISY_MAIN_LEN +
    DAISY_FX_LEN +
    DAISY_VOICE_CFG_LEN +
    DAISY_OSC_CFG_LEN +
    DAISY_ALGO_CFG_LEN,
}

export const DAISY_SAB_CHANNEL_LEN: Record<string, number> = {
  zss_voices: DAISY_VOICES_LEN,
  zss_drums: DAISY_DRUMS_LEN,
  zss_main: DAISY_MAIN_LEN,
  zss_fx: DAISY_FX_LEN,
  zss_voicecfg: DAISY_VOICE_CFG_LEN,
  zss_osccfg: DAISY_OSC_CFG_LEN,
  zss_algocfg: DAISY_ALGO_CFG_LEN,
  zss_vibrato: DAISY_VIBRATO_LEN,
}

/** Worklet SAB maps — injected by `daisy:bundle:processor` in tasks/groups/daisy.ts (do not hand-edit). */
export function formatdaisyworkletsablayout(): string {
  return `const DAISY_SAB_CHANNEL_OFFSET = ${JSON.stringify(DAISY_SAB_CHANNEL_OFFSET, null, 2)}
const DAISY_SAB_CHANNEL_LEN = ${JSON.stringify(DAISY_SAB_CHANNEL_LEN, null, 2)}
`
}
