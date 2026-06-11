import { analyzelevelstability } from 'zss/feature/synth/backend/wasm/levelstabilitymetrics'

/** Target: drums ~3 dB hotter than single #synth voice. */
export const PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB = 3

export const PLAY_DRUM_BALANCE_MIN_DB = 2

export const PLAY_DRUM_BALANCE_MAX_DB = 4

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
    `drum − play ${m.drumminusplaydb.toFixed(1)} dB (target ${PLAY_DRUM_TARGET_DRUM_MINUS_PLAY_DB} ±1)`,
    gate.pass ? 'PASS' : `FAIL: ${gate.reasons.join('; ')}`,
  ]
  return lines.join('\n')
}
