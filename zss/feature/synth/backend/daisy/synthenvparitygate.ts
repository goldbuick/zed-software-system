import {
  analyzelevelstability,
  type LEVEL_STABILITY_METRICS,
} from '../wasm/levelstabilitymetrics.ts'

import { SYNTH_ENV_PARITY_REQUIRED_IDS } from './synthenvparityscenario.ts'

const SILENCE_PEAK_DB = -60

/** Linear ZssLinearEnv vs Tone exponential — sustain level often differs ~10 dB. */
export const SYNTH_ENV_SUSTAIN_TOL_DB = 12

/** FM/AM timbre level skew — carrier env shape still gated via release checkpoints. */
export const SYNTH_ENV_FM_SUSTAIN_TOL_DB = 24

export const SYNTH_ENV_RELEASE_TOL_DB = 10

export const SYNTH_ENV_RELEASE_CHECKPOINTS_SEC = [1, 3, 6] as const

export type SYNTH_ENV_CHECKPOINT_METRICS = {
  secafternoteoff: number
  daisypeakdb: number
  tonepeakdb: number
  daisyrmsdb: number
  tonermsdb: number
}

export type SYNTH_ENV_PARITY_METRICS = {
  id: string
  gatesec: number
  releasesec: number
  sustainmediandb: { daisy: number; tone: number }
  checkpoints: SYNTH_ENV_CHECKPOINT_METRICS[]
  timelinesmatch?: boolean
}

export type SYNTH_ENV_PARITY_RESULT = {
  metrics: SYNTH_ENV_PARITY_METRICS
  daisy: LEVEL_STABILITY_METRICS
  tone: LEVEL_STABILITY_METRICS
}

export type SYNTH_ENV_PARITY_GATE_RESULT = {
  pass: boolean
  required: boolean
  reasons: string[]
  result: SYNTH_ENV_PARITY_RESULT
}

function windowpeakat(
  samples: Float32Array,
  samplerate: number,
  tcenter: number,
  windowms = 46,
): number {
  const halfwin = (windowms / 1000) * 0.5
  const t0 = Math.max(0, tcenter - halfwin)
  const t1 = tcenter + halfwin
  const i0 = Math.max(0, Math.floor(t0 * samplerate))
  const i1 = Math.min(samples.length, Math.ceil(t1 * samplerate))
  if (i1 <= i0) {
    return -120
  }
  let peak = 0
  for (let i = i0; i < i1; i++) {
    const abs = samples[i] < 0 ? -samples[i] : samples[i]
    if (abs > peak) {
      peak = abs
    }
  }
  return peak > 0 ? 20 * Math.log10(peak) : -120
}

function windowrmsat(
  samples: Float32Array,
  samplerate: number,
  tcenter: number,
  windowms = 46,
): number {
  const halfwin = (windowms / 1000) * 0.5
  const t0 = Math.max(0, tcenter - halfwin)
  const t1 = tcenter + halfwin
  const i0 = Math.max(0, Math.floor(t0 * samplerate))
  const i1 = Math.min(samples.length, Math.ceil(t1 * samplerate))
  if (i1 <= i0) {
    return -120
  }
  let sumsq = 0
  for (let i = i0; i < i1; i++) {
    sumsq += samples[i] * samples[i]
  }
  const rms = Math.sqrt(sumsq / (i1 - i0))
  return rms > 0 ? 20 * Math.log10(rms) : -120
}

/** Median window peak during gated sustain (trim attack/decay edges). */
export function sustainsmediandb(
  samples: Float32Array,
  samplerate: number,
  gatesec: number,
  attacksec: number,
  decaysec: number,
  windowms = 46,
): number {
  const metrics = analyzelevelstability(samples, samplerate, windowms)
  const tstart = attacksec + decaysec + 0.02
  const tend = gatesec - 0.05
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
  if (peaks.length === 0) {
    return -120
  }
  const sorted = [...peaks].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) * 0.5
    : sorted[mid]
}

export function buildsynthenvcheckpoints(
  daisysamples: Float32Array,
  daisysamplerate: number,
  tonemono: Float32Array,
  tonesamplerate: number,
  gatesec: number,
  rendersec: number,
  windowms = 46,
): SYNTH_ENV_CHECKPOINT_METRICS[] {
  const checkpoints: SYNTH_ENV_CHECKPOINT_METRICS[] = []
  for (const offset of SYNTH_ENV_RELEASE_CHECKPOINTS_SEC) {
    const t = gatesec + offset
    if (t > rendersec - 0.1) {
      continue
    }
    checkpoints.push({
      secafternoteoff: offset,
      daisypeakdb: windowpeakat(daisysamples, daisysamplerate, t, windowms),
      tonepeakdb: windowpeakat(tonemono, tonesamplerate, t, windowms),
      daisyrmsdb: windowrmsat(daisysamples, daisysamplerate, t, windowms),
      tonermsdb: windowrmsat(tonemono, tonesamplerate, t, windowms),
    })
  }
  return checkpoints
}

export function evalsynthenvparitygate(
  result: SYNTH_ENV_PARITY_RESULT,
  sustaintol = SYNTH_ENV_SUSTAIN_TOL_DB,
  releasetol = SYNTH_ENV_RELEASE_TOL_DB,
): SYNTH_ENV_PARITY_GATE_RESULT {
  const reasons: string[] = []
  const required = SYNTH_ENV_PARITY_REQUIRED_IDS.has(result.metrics.id)
  const { sustainmediandb, checkpoints, timelinesmatch } = result.metrics

  const isfm = result.metrics.id.includes('fmsquare') || result.metrics.id.includes('fm-')
  const effectivesustaintol = isfm ? SYNTH_ENV_FM_SUSTAIN_TOL_DB : sustaintol

  const sustaindelta = Math.abs(
    sustainmediandb.daisy - sustainmediandb.tone,
  )
  if (sustaindelta > effectivesustaintol) {
    reasons.push(
      `sustain median delta ${sustaindelta.toFixed(1)} dB > ${effectivesustaintol} dB (Daisy ${sustainmediandb.daisy.toFixed(1)} vs Tone ${sustainmediandb.tone.toFixed(1)} dBFS)`,
    )
  }

  for (const cp of checkpoints) {
    if (isfm && cp.secafternoteoff === 1) {
      continue
    }
    const peakdelta = Math.abs(cp.daisypeakdb - cp.tonepeakdb)
    const checkpointtol = releasetol
    if (peakdelta > checkpointtol) {
      reasons.push(
        `release @+${cp.secafternoteoff}s peak delta ${peakdelta.toFixed(1)} dB > ${checkpointtol} dB (Daisy ${cp.daisypeakdb.toFixed(1)} vs Tone ${cp.tonepeakdb.toFixed(1)} dBFS)`,
      )
    }
    if (cp.tonepeakdb > SILENCE_PEAK_DB + 5 && cp.daisypeakdb < SILENCE_PEAK_DB + 5) {
      reasons.push(
        `release @+${cp.secafternoteoff}s Daisy silent (${cp.daisypeakdb.toFixed(1)} dBFS) while Tone ${cp.tonepeakdb.toFixed(1)} dBFS — render truncated?`,
      )
    }
  }

  if (timelinesmatch === false) {
    reasons.push('retrigger peak timeline mismatch (gain-matched ASCII)')
  }

  const pass = reasons.length === 0
  return {
    pass,
    required,
    reasons,
    result,
  }
}

export function formatsynthenvparityreport(
  gate: SYNTH_ENV_PARITY_GATE_RESULT,
  rendersec: number,
): string {
  const m = gate.result.metrics
  const lines = [
    `Synth env parity: ${m.id}`,
    `gate ${m.gatesec.toFixed(2)}s release ${m.releasesec}s render ${rendersec.toFixed(2)}s`,
    '',
    `sustain median  Daisy ${m.sustainmediandb.daisy.toFixed(1)} dBFS  Tone ${m.sustainmediandb.tone.toFixed(1)} dBFS`,
  ]
  for (const cp of m.checkpoints) {
    lines.push(
      `release +${cp.secafternoteoff}s  Daisy pk ${cp.daisypeakdb.toFixed(1)} / rms ${cp.daisyrmsdb.toFixed(1)}  Tone pk ${cp.tonepeakdb.toFixed(1)} / rms ${cp.tonermsdb.toFixed(1)} dBFS`,
    )
  }
  if (m.timelinesmatch !== undefined) {
    lines.push(`retrigger timeline match: ${m.timelinesmatch ? 'yes' : 'no'}`)
  }
  lines.push(
    '',
    gate.pass ? 'PASS' : `FAIL: ${gate.reasons.join('; ')}`,
    gate.required ? '(required for CI)' : '(advisory)',
  )
  return lines.join('\n')
}
