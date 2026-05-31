/**
 * Post-fix acceptance gates for Daisy master dynamics (Tone-first cutover).
 * Primary gate: yarn test:master-dynamics-parity (master-comp-drums + master-full-mix TIGHT RMS/peak).
 * Secondary: SCALE CREW level-stability with retuned thresholds below.
 *
 * Runtime staging lives in zss_daisy_synth.cpp (content-first). Master parity offline renders
 * may use hotter play/bg volumes in daisyparityrender.ts without changing runtime #vol defaults.
 */
export const MASTER_DYNAMICS_PRIMARY_PATCHES = [
  'master-comp-drums',
  'master-full-mix',
] as const

/** TIGHT offline parity vs Tone (paritytolerances TIGHT profile). */
export const MASTER_DYNAMICS_RMS_TOL_DB = 1
export const MASTER_DYNAMICS_PEAK_TOL_DB = 2
/** Offline metric rounding (2 decimal dB) — applied to primary patch RMS gate only. */
export const MASTER_DYNAMICS_RMS_FLOAT_EPS_DB = 0.05

/** Post-fix SCALE CREW gates (retuned after full-mix compressor + drum restaging). */
export const SCALE_CREW_MAX_STEADY_PEAK_DELTA_DB = 5
export const SCALE_CREW_MAX_OVERALL_PEAK_GAP_DB = 3
export const SCALE_CREW_MAX_MIX_RMS_DELTA_DB = 3

/** Expect higher comp GR on drum-heavy renders vs split-detector baseline (~22 dB). */
export const SCALE_CREW_MIN_COMP_GR_RANGE_DB = 30

/** Cap runaway pumping from parity-hot staging (pre-fix was ~34 dB with clip). */
export const SCALE_CREW_MAX_COMP_GR_RANGE_DB = 38

/** Final render peak (post master chain) — 0 dBFS ceiling with headroom. */
export const SCALE_CREW_MAX_OUTPUT_PEAK_DB = 0.5

/** Sidechain duck gain (linear, includes makeup) — dense SCALE CREW stays above this. */
export const SCALE_CREW_DUCK_MIN_DB = 10

/**
 * Runtime master staging in zss_daisy_synth.cpp (content-first).
 * Parity patches may need separate iteration; do not crank runtime makeup for offline gates alone.
 */
export const DAISY_RUNTIME_MASTER_MAKEUP_DB = 22
export const DAISY_RUNTIME_DRUM_BUS_PLAY_RATIO = 1.35
