import { Note } from 'tonal'

import { isnumber } from 'zss/mapping/types'

/** Loose peak spread (square harmonics confuse Goertzel). */
export const PITCH_STABILITY_MAX_CENT_DRIFT = 10

/** Strike counter in detune slot adds ~1¢ per note → slope ~1.0 by note 16. */
export const PITCH_STABILITY_MAX_STRIKE_DRIFT_RATE = 0.75

export type PITCH_STABILITY_METRICS = {
  expectedhz: number
  notecount: number
  attacktimesec: number[]
  estimatedhz: number[]
  centdelta: number[]
  maxcentdrift: number
  /** (last note Δ¢ − first) / (note count − 1); ~1 with strike-as-detune bug. */
  strikedriftrate: number
}

export function hztocents(ratio: number): number {
  if (ratio <= 0 || !Number.isFinite(ratio)) {
    return 999
  }
  return 1200 * Math.log2(ratio)
}

/** Goertzel magnitude at target Hz (dependency-free pitch probe). */
export function goertzelmag(
  samples: Float32Array,
  samplerate: number,
  targethz: number,
): number {
  if (samples.length < 8 || targethz <= 0) {
    return 0
  }
  const omega = (2 * Math.PI * targethz) / samplerate
  const coeff = 2 * Math.cos(omega)
  let s0 = 0
  let s1 = 0
  let s2 = 0
  for (let i = 0; i < samples.length; i++) {
    s0 = samples[i] + coeff * s1 - s2
    s2 = s1
    s1 = s0
  }
  const real = s1 - s2 * Math.cos(omega)
  const imag = s2 * Math.sin(omega)
  return Math.sqrt(real * real + imag * imag) / samples.length
}

/** Scan ±scanrange cents around expected; return Hz with strongest Goertzel response. */
export function estimatefundamentalhz(
  samples: Float32Array,
  samplerate: number,
  expectedhz: number,
  scanrangecents = 50,
  scancentsstep = 1,
): number {
  let besthz = expectedhz
  let bestmag = 0
  for (let cents = -scanrangecents; cents <= scanrangecents; cents += scancentsstep) {
    const hz = expectedhz * Math.pow(2, cents / 1200)
    const mag = goertzelmag(samples, samplerate, hz)
    if (mag > bestmag) {
      bestmag = mag
      besthz = hz
    }
  }
  return besthz
}

export function analyzepitchstability(
  samples: Float32Array,
  samplerate: number,
  attacktimesec: number[],
  expectedpitch: string,
  windowms = 32,
  windowoffsetms = 12,
): PITCH_STABILITY_METRICS {
  const raw = Note.freq(expectedpitch)
  const expected = isnumber(raw) && raw > 0 ? raw : 261.63
  const winlen = Math.max(64, Math.floor((windowms / 1000) * samplerate))
  const offset = Math.floor((windowoffsetms / 1000) * samplerate)
  const estimatedhz: number[] = []

  for (let i = 0; i < attacktimesec.length; i++) {
    const start = Math.min(
      samples.length - winlen,
      Math.max(0, Math.floor(attacktimesec[i] * samplerate) + offset),
    )
    const slice = samples.subarray(start, start + winlen)
    estimatedhz.push(estimatefundamentalhz(slice, samplerate, expected))
  }

  const centdelta: number[] = []
  const ref = estimatedhz[0] ?? expected
  for (let i = 0; i < estimatedhz.length; i++) {
    centdelta.push(hztocents(estimatedhz[i] / ref))
  }

  let maxcentdrift = 0
  for (let i = 1; i < centdelta.length; i++) {
    const drift = Math.abs(centdelta[i] - centdelta[0])
    if (drift > maxcentdrift) {
      maxcentdrift = drift
    }
  }

  const lastidx = Math.max(1, centdelta.length - 1)
  const strikedriftrate = (centdelta[lastidx] - centdelta[0]) / lastidx

  return {
    expectedhz: expected,
    notecount: attacktimesec.length,
    attacktimesec,
    estimatedhz,
    centdelta,
    maxcentdrift,
    strikedriftrate,
  }
}

export type PITCH_STABILITY_GATE_RESULT = {
  pass: boolean
  metrics: PITCH_STABILITY_METRICS
  reasons: string[]
}

export function evalpitchstabilitygate(
  metrics: PITCH_STABILITY_METRICS,
  maxcentdrift = PITCH_STABILITY_MAX_CENT_DRIFT,
): PITCH_STABILITY_GATE_RESULT {
  const reasons: string[] = []
  if (metrics.notecount < 2) {
    reasons.push('need at least 2 notes')
  }
  if (metrics.maxcentdrift > maxcentdrift) {
    reasons.push(
      `maxcentdrift ${metrics.maxcentdrift.toFixed(2)} > ${maxcentdrift}`,
    )
  }
  if (metrics.strikedriftrate > PITCH_STABILITY_MAX_STRIKE_DRIFT_RATE) {
    reasons.push(
      `strikedriftrate ${metrics.strikedriftrate.toFixed(2)}¢/note > ${PITCH_STABILITY_MAX_STRIKE_DRIFT_RATE} (strike counter in detune slot?)`,
    )
  }
  return {
    pass: reasons.length === 0,
    metrics,
    reasons,
  }
}

export function formatpitchstabilityreport(
  scenarioid: string,
  gate: PITCH_STABILITY_GATE_RESULT,
): string {
  const m = gate.metrics
  const lines = [
    `Pitch stability: ${scenarioid}`,
    `expected ${m.expectedhz.toFixed(2)} Hz | notes ${m.notecount}`,
    `maxcentdrift ${m.maxcentdrift.toFixed(2)}¢ (limit ${PITCH_STABILITY_MAX_CENT_DRIFT}¢)`,
    `strikedriftrate ${m.strikedriftrate.toFixed(2)}¢/note (limit ${PITCH_STABILITY_MAX_STRIKE_DRIFT_RATE})`,
    gate.pass ? 'PASS' : `FAIL: ${gate.reasons.join('; ')}`,
    '',
    'Per-note estimate vs note 0:',
  ]
  for (let i = 0; i < m.estimatedhz.length; i++) {
    lines.push(
      `  #${i} t=${m.attacktimesec[i].toFixed(3)}s hz=${m.estimatedhz[i].toFixed(2)} Δ=${m.centdelta[i].toFixed(2)}¢`,
    )
  }
  return lines.join('\n')
}
