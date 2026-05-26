/** Per-voice output trim in masterout (drums use DRUM_BUS_GAIN separately). */
export const WASM_VOICE_OUT_GAIN = 1.0

/** BeepBox chip noise — ZSS trim after expression * noiseBaseExpression (0.19). */
export const NOISE_BASE_EXPRESSION = 0.19

/** ~square peak for retro (expression 0.25): 1 / (0.25 * 0.19) ≈ 21. */
export const WASM_NOISE_VOICE_GAIN = 21

/** Soft chip types (white/hollow) lose level via pitch-relative smoothing. */
export const WASM_NOISE_SOFT_GAIN = 3.0

/** Legacy metallic table peaks ~22; LFSR types peak at ±1. */
export const WASM_NOISE_METALLIC_NORM = 1 / 22

/** Sine RMS is ~3 dB below square at the same peak; match square loudness. */
export const WASM_SINE_VOICE_GAIN = Math.SQRT2

/** Per-drum voice gains after DSP (index = #play digit). */
export const WASM_DRUM_VOICE_GAINS = [
  0.24, // 0 tick
  0.22, // 1 tweet
  0.4, // 2 cowbell
  0.26, // 3 clap
  0.3, // 4 hi snare
  0.26, // 5 hi wood
  0.3, // 6 low snare
  0.28, // 7 tom
  0.26, // 8 low wood
  0.7, // 9 bass
]

/** HP/noise trim applied before per-drum gain on tick/tweet. */
export const WASM_DRUM_TICK_TRIM = 1.22
export const WASM_DRUM_TWEET_TRIM = 1.1
export const WASM_DRUM_CLAP_DRY = 0.35
export const WASM_DRUM_CLAP_WET = 1.1

function volumetodb(value: number) {
  return 20 * Math.log10(value) - 35
}

/** Matches Tone `drumvolume = new Volume(volumetodb(100) + 10)`. */
export const WASM_DRUM_BUS_DB = volumetodb(100) + 10
export const WASM_DRUM_BUS_GAIN = Math.pow(10, WASM_DRUM_BUS_DB / 20)

/** Matches Tone `playvolume = new Volume(volumetodb(20))`. */
export const WASM_PLAY_BUS_DB = volumetodb(20)
export const WASM_PLAY_BUS_GAIN = Math.pow(10, WASM_PLAY_BUS_DB / 20)

/** Trim after main compressor + razzle in WASM master chain. */
export const WASM_MASTER_TRIM_DB = 0

/** Tone sidechain makeup (+24 dB) minus headroom; calibrates #vol 80 without cranking to 500. */
export const WASM_MASTER_MAKEUP_DB = 22

/** Tone AlgoSynth per-operator volume (−10 dB). */
export const WASM_ALGO_OP_GAIN = Math.pow(10, -10 / 20)

/** Final algo bus trim — preserves legacy WASM loudness after parallel routing fix. */
export const WASM_ALGO_OUT_GAIN = 0.18

/** FM modindex → carrier Hz scale (calibrated vs Tone FMOscillator). */
export const WASM_FM_HZ_SCALE = 1

/** Tape hiss level — Tone pink noise at about −50 dB. */
export const WASM_RAZZLE_HISS_GAIN = 0.0005
