/** Per-voice output trim in masterout (drums use DRUM_BUS_GAIN separately). */
export const WASM_VOICE_OUT_GAIN = 1.0

/** BeepBox chip noise — ZSS trim after expression * noiseBaseExpression (0.19). */
export const NOISE_BASE_EXPRESSION = 0.19

/** ~square peak for retro (expression 0.25): 1 / (0.25 * 0.19) ≈ 21. */
export const WASM_NOISE_VOICE_GAIN = 21

/** LFSR chip voices (retro/buzz/clang/metallic) — play-bus balance trim. */
export const WASM_LFSR_VOICE_BOOST = 2.5

/** Soft chip types (white/hollow) lose level via pitch-relative smoothing. */
export const WASM_NOISE_SOFT_GAIN = 3.0

/** Legacy metallic table peaks ~22; LFSR types peak at ±1. */
export const WASM_NOISE_METALLIC_NORM = 1 / 22

/** Sine RMS is ~3 dB below square at the same peak; match square loudness. */
export const WASM_SINE_VOICE_GAIN = Math.SQRT2

/** Per-drum voice gains after DSP (index = #play digit). */
export const WASM_DRUM_VOICE_GAINS = [
  0.26, // 0 tick
  0.24, // 1 tweet
  0.4, // 2 cowbell
  0.35, // 3 clap
  0.3, // 4 hi snare
  0.26, // 5 hi wood
  0.3, // 6 low snare
  0.28, // 7 tom
  0.26, // 8 low wood
  0.67, // 9 bass
]

/** HP/noise trim applied before per-drum gain on tick/tweet (biquad HP is steeper than 1-pole). */
export const WASM_DRUM_TICK_TRIM = 1.35
export const WASM_DRUM_TWEET_TRIM = 1.25

function volumetodb(value: number) {
  return 20 * Math.log10(value) - 35
}

export const WASM_DRUM_BUS_DB = volumetodb(32)
export const WASM_DRUM_BUS_GAIN = Math.pow(10, WASM_DRUM_BUS_DB / 20)

export const WASM_PLAY_BUS_DB = volumetodb(32)
export const WASM_PLAY_BUS_GAIN = Math.pow(10, WASM_PLAY_BUS_DB / 20)

/** Trim after main compressor + razzle in WASM master chain. */
export const WASM_MASTER_TRIM_DB = -2

/** Tone sidechain makeup (+24 dB) minus headroom; calibrates #vol 80 without cranking to 500. */
export const WASM_MASTER_MAKEUP_DB = 22

/** Tone AlgoSynth per-operator volume (−10 dB). */
export const WASM_ALGO_OP_GAIN = Math.pow(10, -10 / 20)

/** Final algo bus trim — preserves legacy WASM loudness after parallel routing fix. */
export const WASM_ALGO_OUT_GAIN = 0.18

/** FM modindex → carrier Hz scale (calibrated vs Tone FMOscillator). */
export const WASM_FM_HZ_SCALE = 1

/** Razzle wet sends — Tone is 0.1 / 0.5; trimmed slightly. Daisy: kRazzle* in cpp. */
export const WASM_RAZZLE_VIBRATO_WET = 0.1
export const WASM_RAZZLE_CHORUS_WET = 0.4
export const WASM_RAZZLE_CHORUS_DEPTH_SEC = 0.007

/** Always-on tape bed — Tone pink noise ~−50 dB; white noise needs slight bump. */
export const WASM_RAZZLE_HISS_GAIN = 0.0035
