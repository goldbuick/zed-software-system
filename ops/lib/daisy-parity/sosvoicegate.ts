import type { PARITY_AUDIO_METRICS } from './paritymetrics'

export type SOS_VOICE_GATE = {
  pass: boolean
  reason: string
}

export type SOS_VOICE_TOLERANCE = {
  rmsdbtol: number
  peakdbtol: number
  centroidhztol: number
  bandratiotol: number
}

export const SOS_VOICE_TOLERANCE: SOS_VOICE_TOLERANCE = {
  rmsdbtol: 4,
  peakdbtol: 6,
  centroidhztol: 900,
  bandratiotol: 0.22,
}

export function evalsosvoicegate(
  patchid: string,
  actual: PARITY_AUDIO_METRICS,
  expected: PARITY_AUDIO_METRICS,
  tol: SOS_VOICE_TOLERANCE = SOS_VOICE_TOLERANCE,
): SOS_VOICE_GATE {
  if (expected.rmsdb <= -119) {
    return { pass: false, reason: `${patchid} | missing or silent fixture` }
  }
  if (actual.rmsdb <= -119) {
    return { pass: false, reason: `${patchid} | render is silent` }
  }
  if (Math.abs(actual.rmsdb - expected.rmsdb) > tol.rmsdbtol) {
    return {
      pass: false,
      reason: `${patchid} | rms ${actual.rmsdb.toFixed(2)} vs ${expected.rmsdb.toFixed(2)}`,
    }
  }
  if (Math.abs(actual.peakdb - expected.peakdb) > tol.peakdbtol) {
    return {
      pass: false,
      reason: `${patchid} | peak ${actual.peakdb.toFixed(2)} vs ${expected.peakdb.toFixed(2)}`,
    }
  }
  if (
    expected.centroidhz > 0 &&
    Math.abs(actual.centroidhz - expected.centroidhz) > tol.centroidhztol
  ) {
    return {
      pass: false,
      reason: `${patchid} | centroid ${actual.centroidhz.toFixed(0)} vs ${expected.centroidhz.toFixed(0)}`,
    }
  }
  if (Math.abs(actual.bandlow - expected.bandlow) > tol.bandratiotol) {
    return {
      pass: false,
      reason: `${patchid} | bandlow ${actual.bandlow.toFixed(3)} vs ${expected.bandlow.toFixed(3)}`,
    }
  }
  if (Math.abs(actual.bandmid - expected.bandmid) > tol.bandratiotol) {
    return {
      pass: false,
      reason: `${patchid} | bandmid ${actual.bandmid.toFixed(3)} vs ${expected.bandmid.toFixed(3)}`,
    }
  }
  if (Math.abs(actual.bandhigh - expected.bandhigh) > tol.bandratiotol) {
    return {
      pass: false,
      reason: `${patchid} | bandhigh ${actual.bandhigh.toFixed(3)} vs ${expected.bandhigh.toFixed(3)}`,
    }
  }
  return { pass: true, reason: `${patchid} | ok` }
}
