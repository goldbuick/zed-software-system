import type { LEVEL_STABILITY_METRICS } from 'zss/feature/synth/backend/wasm/levelstabilitymetrics'

const SILENT_DB = -120

/** Solo FX scenarios used for wet-lift diagnosis (filter: fxmatrix, exclude dry/stacks). */
export const FX_BUS_SOLO_SCENARIO_SUFFIXES = [
  'fxmatrix-fc',
  'fxmatrix-echo',
  'fxmatrix-reverb',
  'fxmatrix-autofilter',
  'fxmatrix-distort',
  'fxmatrix-autowah',
] as const

export type FX_BUS_METRICS = {
  scenarioId: string
  overallrmsdb: number
  /** vs fxmatrix-dry overall RMS (proxy for wet audibility). */
  rmsliftvsdrydb: number
  /** Orthogonal wet RMS estimate: sqrt(rms_out² − rms_dry²). */
  estimatedwetrmsdb: number
  wetdryratioDb: number
}

function lineartodb(value: number): number {
  return value > 0 ? 20 * Math.log10(value) : SILENT_DB
}

function dbtolinear(db: number): number {
  return Math.pow(10, db / 20)
}

export function estimatewetfrommix(
  outrmsdb: number,
  dryrmsdb: number,
): { estimatedwetrmsdb: number; wetdryratioDb: number } {
  const outlin = dbtolinear(outrmsdb)
  const drylin = dbtolinear(dryrmsdb)
  const wetsq = Math.max(0, outlin * outlin - drylin * drylin)
  const wetlin = Math.sqrt(wetsq)
  const estimatedwetrmsdb = lineartodb(wetlin)
  const wetdryratioDb =
    drylin > 1e-8 && wetlin > 1e-8 ? lineartodb(wetlin / drylin) : SILENT_DB
  return { estimatedwetrmsdb, wetdryratioDb }
}

export function computefxbusmetrics(
  scenarioId: string,
  metrics: LEVEL_STABILITY_METRICS,
  drymetrics: LEVEL_STABILITY_METRICS,
): FX_BUS_METRICS {
  const { estimatedwetrmsdb, wetdryratioDb } = estimatewetfrommix(
    metrics.overallrmsdb,
    drymetrics.overallrmsdb,
  )
  return {
    scenarioId,
    overallrmsdb: metrics.overallrmsdb,
    rmsliftvsdrydb: metrics.overallrmsdb - drymetrics.overallrmsdb,
    estimatedwetrmsdb,
    wetdryratioDb,
  }
}

export function isfxbussoloscenario(id: string): boolean {
  return (FX_BUS_SOLO_SCENARIO_SUFFIXES as readonly string[]).includes(id)
}

export function formatfxbusmetricsline(row: FX_BUS_METRICS): string {
  return [
    row.scenarioId.padEnd(28),
    `rms ${row.overallrmsdb.toFixed(1)} dBFS`,
    `lift +${row.rmsliftvsdrydb.toFixed(1)} dB`,
    `wet≈${row.estimatedwetrmsdb.toFixed(1)} dBFS`,
    `wet/dry ${row.wetdryratioDb.toFixed(1)} dB`,
  ].join('  ')
}
