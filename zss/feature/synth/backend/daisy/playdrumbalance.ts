import { analyzelevelstability } from 'zss/feature/synth/backend/wasm/levelstabilitymetrics'

/** Target: mid-kit drum stem vs a single #synth voice (SC-bypass stems).
 * Flat kDrumGains 0.05 sits ~11 dB under play (cafe ear / limiter headroom).
 * When gains are 0 (muted), drum peak hits the silence floor and gate PASSes.
 */
export const PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB = -11

export const PLAY_DRUM_BALANCE_MIN_DB = -13

export const PLAY_DRUM_BALANCE_MAX_DB = -9

/** Peaks at/below this mean kit is muted (kDrumGains 0) — not a balance fail. */
export const PLAY_DRUM_MUTE_FLOOR_DB = -60

export type PLAY_DRUM_BALANCE_METRICS = {
  playpeakdb: number
  drumpeakdb: number
  drumminusplaydb: number
}

export type PLAY_DRUM_BALANCE_GATE_RESULT = {
  pass: boolean
  metrics: PLAY_DRUM_BALANCE_METRICS
  reasons: string[]
}

export function analyzestempeakdb(
  samples: Float32Array,
  samplerate: number,
  windowms = 46,
): number {
  const metrics = analyzelevelstability(samples, samplerate, windowms)
  return metrics.overallpeakdb
}

export function analyzeplaydrumbalance(
  playsamples: Float32Array,
  drumsamples: Float32Array,
  samplerate: number,
  windowms = 46,
): PLAY_DRUM_BALANCE_METRICS {
  const playpeakdb = analyzestempeakdb(playsamples, samplerate, windowms)
  const drumpeakdb = analyzestempeakdb(drumsamples, samplerate, windowms)
  return {
    playpeakdb,
    drumpeakdb,
    drumminusplaydb: drumpeakdb - playpeakdb,
  }
}

export function evalplaydrumbalancegate(
  metrics: PLAY_DRUM_BALANCE_METRICS,
  targetdb = PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB,
  minband = PLAY_DRUM_BALANCE_MIN_DB,
  maxband = PLAY_DRUM_BALANCE_MAX_DB,
): PLAY_DRUM_BALANCE_GATE_RESULT {
  if (metrics.drumpeakdb <= PLAY_DRUM_MUTE_FLOOR_DB) {
    return { pass: true, metrics, reasons: [] }
  }
  const reasons: string[] = []
  if (metrics.drumminusplaydb < minband) {
    if (metrics.drumminusplaydb < 0) {
      reasons.push(
        `drums ${Math.abs(metrics.drumminusplaydb).toFixed(1)} dB below play (need ${minband}–${maxband} dB above, target ${targetdb})`,
      )
    } else {
      reasons.push(
        `drums only ${metrics.drumminusplaydb.toFixed(1)} dB above play (need ${minband}–${maxband}, target ${targetdb})`,
      )
    }
  }
  if (metrics.drumminusplaydb > maxband) {
    reasons.push(
      `drums ${metrics.drumminusplaydb.toFixed(1)} dB above play (need ${minband}–${maxband}, target ${targetdb})`,
    )
  }
  return {
    pass: reasons.length === 0,
    metrics,
    reasons,
  }
}

export function formatplaydrumbalancereport(
  gate: PLAY_DRUM_BALANCE_GATE_RESULT,
): string {
  const m = gate.metrics
  const lines = [
    'Play vs drum balance (isolated stems)',
    `play peak ${m.playpeakdb.toFixed(1)} dBFS`,
    `drum peak ${m.drumpeakdb.toFixed(1)} dBFS`,
    m.drumpeakdb <= PLAY_DRUM_MUTE_FLOOR_DB
      ? `drum − play n/a (kit muted, peak ${m.drumpeakdb.toFixed(1)} dBFS)`
      : `drum − play ${m.drumminusplaydb.toFixed(1)} dB (target ${PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB} ±${Math.abs(PLAY_DRUM_BALANCE_MAX_DB - PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB)})`,
    gate.pass ? 'PASS' : `FAIL: ${gate.reasons.join('; ')}`,
  ]
  return lines.join('\n')
}
