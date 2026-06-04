import {
  analyzelevelstability,
  type LEVEL_STABILITY_METRICS,
} from '../wasm/levelstabilitymetrics.ts'

const SILENCE_PEAK_DB = -60
import {
  audiopowermetrics,
  type PARITY_AUDIO_METRICS,
} from '../wasm/paritymetrics.ts'

/** Bg stab onset in duck-bg-stab / main-duck-bg. */
export const SIDECHAIN_STAB_TIME_SEC = 0.75

export const SIDECHAIN_MIN_DUCK_DEPTH_DB = 4

export const SIDECHAIN_MAX_BYPASS_DUCK_DB = 2

export const SIDECHAIN_PARITY_PATCH_ID = 'main-duck-bg'

export type SIDECHAIN_DUCK_METRICS = {
  duckdepthdb: number
  prepeakdb: number
  postpeakdb: number
  stabtime: number
}

export type SIDECHAIN_PARITY_RESULT = {
  duckon: SIDECHAIN_DUCK_METRICS
  duckoff: SIDECHAIN_DUCK_METRICS
  /** Post-stab sustain: SC-off median − SC-on (primary duck readout). */
  abduckdepthdb: number
  daisymetrics?: PARITY_AUDIO_METRICS
  tonemetrics?: PARITY_AUDIO_METRICS
}

export type SIDECHAIN_PARITY_GATE_RESULT = {
  pass: boolean
  reasons: string[]
  result: SIDECHAIN_PARITY_RESULT
}

function median(values: number[]): number {
  if (values.length === 0) {
    return -120
  }
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) * 0.5
    : sorted[mid]
}

function collectwindowpeaks(
  metrics: LEVEL_STABILITY_METRICS,
  tstart: number,
  tend: number,
): number[] {
  const peaks: number[] = []
  for (let i = 0; i < metrics.windowpeaksDb.length; i++) {
    const t = (i * metrics.windowms) / 1000
    const peak = metrics.windowpeaksDb[i]
    if (peak <= SILENCE_PEAK_DB) {
      continue
    }
    if (t >= tstart && t <= tend) {
      peaks.push(peak)
    }
  }
  return peaks
}

/** Median window peak in a time range (sustain / play level proxy). */
export function sustainpeakmedian(
  samples: Float32Array,
  samplerate: number,
  tstart: number,
  tend: number,
  windowms = 46,
): number {
  const metrics = analyzelevelstability(samples, samplerate, windowms)
  return median(collectwindowpeaks(metrics, tstart, tend))
}

/** Play level drop after bg stab on one render (higher = more duck). */
export function analyzeduckdepth(
  samples: Float32Array,
  samplerate: number,
  stabtime = SIDECHAIN_STAB_TIME_SEC,
  windowms = 46,
): SIDECHAIN_DUCK_METRICS {
  const metrics = analyzelevelstability(samples, samplerate, windowms)
  const preend = stabtime - 0.08
  const poststart = stabtime + 0.12
  const postend = stabtime + 1.2
  const pre = collectwindowpeaks(metrics, 0.12, preend)
  const post = collectwindowpeaks(metrics, poststart, postend)

  const prepeakdb = median(pre)
  const postpeakdb = median(post)
  const duckdepthdb =
    pre.length > 0 && post.length > 0 ? prepeakdb - postpeakdb : 0
  return {
    duckdepthdb,
    prepeakdb,
    postpeakdb,
    stabtime,
  }
}

/** A/B duck depth: louder post-stab sustain with SC bypassed vs active. */
export function analyzeduckdepthpair(
  onsamples: Float32Array,
  offsamples: Float32Array,
  samplerate: number,
  stabtime = SIDECHAIN_STAB_TIME_SEC,
  windowms = 46,
): number {
  const poststart = stabtime + 0.12
  const postend = stabtime + 1.2
  const onpost = sustainpeakmedian(onsamples, samplerate, poststart, postend, windowms)
  const offpost = sustainpeakmedian(
    offsamples,
    samplerate,
    poststart,
    postend,
    windowms,
  )
  if (onpost <= SILENCE_PEAK_DB + 1 || offpost <= SILENCE_PEAK_DB + 1) {
    return 0
  }
  return offpost - onpost
}

export function evalsidechainparitygate(
  result: SIDECHAIN_PARITY_RESULT,
  minduck = SIDECHAIN_MIN_DUCK_DEPTH_DB,
  maxbypassduck = SIDECHAIN_MAX_BYPASS_DUCK_DB,
): SIDECHAIN_PARITY_GATE_RESULT {
  const reasons: string[] = []

  const onduck = Math.max(result.duckon.duckdepthdb, result.abduckdepthdb)
  if (onduck < minduck) {
    reasons.push(
      `sidechain ON duck ${onduck.toFixed(1)} dB < ${minduck} dB (single ${result.duckon.duckdepthdb.toFixed(1)}, A/B ${result.abduckdepthdb.toFixed(1)}; pre ${result.duckon.prepeakdb.toFixed(1)} → post ${result.duckon.postpeakdb.toFixed(1)} dBFS)`,
    )
  }
  if (result.duckoff.duckdepthdb > maxbypassduck) {
    reasons.push(
      `sidechain OFF still ducks ${result.duckoff.duckdepthdb.toFixed(1)} dB > ${maxbypassduck} dB (bypass broken?)`,
    )
  }

  // Tone peak/RMS on main-duck-bg is advisory (bus gain); duck A/B is the gate.

  return {
    pass: reasons.length === 0,
    reasons,
    result,
  }
}

export function formatsidechainparityreport(
  gate: SIDECHAIN_PARITY_GATE_RESULT,
): string {
  const { duckon, duckoff, daisymetrics, tonemetrics } = gate.result
  const lines = [
    'Sidechain parity: duck-bg-stab',
    `stab @ ${SIDECHAIN_STAB_TIME_SEC}s`,
    '',
    `A/B duck ${gate.result.abduckdepthdb.toFixed(1)} dB (post-stab sustain OFF − ON)`,
    `SC ON:  duck ${duckon.duckdepthdb.toFixed(1)} dB (pre ${duckon.prepeakdb.toFixed(1)} → post ${duckon.postpeakdb.toFixed(1)} dBFS)`,
    `SC OFF: duck ${duckoff.duckdepthdb.toFixed(1)} dB (pre ${duckoff.prepeakdb.toFixed(1)} → post ${duckoff.postpeakdb.toFixed(1)} dBFS)`,
  ]
  if (daisymetrics && tonemetrics) {
    lines.push(
      '',
      `Tone ref peak ${tonemetrics.peakdb.toFixed(1)} rms ${tonemetrics.rmsdb.toFixed(1)} dBFS`,
      `Daisy ON peak ${daisymetrics.peakdb.toFixed(1)} rms ${daisymetrics.rmsdb.toFixed(1)} dBFS`,
    )
  }
  lines.push('', gate.pass ? 'PASS' : `FAIL: ${gate.reasons.join('; ')}`)
  return lines.join('\n')
}

export function metricsfromsamples(
  samples: Float32Array,
  samplerate: number,
): PARITY_AUDIO_METRICS {
  return audiopowermetrics(samples, samplerate)
}

export function duckmetricsfromlevel(
  metrics: LEVEL_STABILITY_METRICS,
  stabtime = SIDECHAIN_STAB_TIME_SEC,
): SIDECHAIN_DUCK_METRICS {
  const preend = stabtime - 0.08
  const poststart = stabtime + 0.12
  const postend = stabtime + 1.2
  const pre = collectwindowpeaks(metrics, 0.12, preend)
  const post = collectwindowpeaks(metrics, poststart, postend)
  const prepeakdb = median(pre)
  const postpeakdb = median(post)
  const duckdepthdb =
    pre.length > 0 && post.length > 0 ? prepeakdb - postpeakdb : 0
  return {
    duckdepthdb,
    prepeakdb,
    postpeakdb,
    stabtime,
  }
}
