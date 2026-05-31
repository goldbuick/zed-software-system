export type COMPRESSOR_METER_SAMPLE = {
  compgrdb: number
  duck: number
  drypeak: number
}

export type COMPRESSOR_METER_STATS = {
  samples: number
  compgrminDb: number
  compgrmaxDb: number
  compgrrangeDb: number
  drypeakmin: number
  drypeakmax: number
  drypeakrange: number
  duckmin: number
  duckmax: number
}

function minvalue(values: number[]): number {
  return values.length > 0 ? Math.min(...values) : 0
}

function maxvalue(values: number[]): number {
  return values.length > 0 ? Math.max(...values) : 0
}

export function analyzecompressormeters(
  samples: COMPRESSOR_METER_SAMPLE[],
): COMPRESSOR_METER_STATS | undefined {
  if (samples.length === 0) {
    return undefined
  }
  const compgr = samples.map((item) => item.compgrdb)
  const drypeak = samples.map((item) => item.drypeak)
  const duck = samples.map((item) => item.duck)
  const compgrminDb = minvalue(compgr)
  const compgrmaxDb = maxvalue(compgr)
  const drypeakmin = minvalue(drypeak)
  const drypeakmax = maxvalue(drypeak)
  return {
    samples: samples.length,
    compgrminDb,
    compgrmaxDb,
    compgrrangeDb: compgrmaxDb - compgrminDb,
    drypeakmin,
    drypeakmax,
    drypeakrange: drypeakmax - drypeakmin,
    duckmin: minvalue(duck),
    duckmax: maxvalue(duck),
  }
}

export function formatcompressormeterline(
  id: string,
  stats: COMPRESSOR_METER_STATS | undefined,
): string {
  if (!stats) {
    return `${id.padEnd(28)} (no meter samples)`
  }
  return [
    id.padEnd(28),
    `grΔ ${stats.compgrrangeDb.toFixed(1)} dB`.padEnd(17),
    `drypk ${stats.drypeakmin.toFixed(3)}–${stats.drypeakmax.toFixed(3)}`.padEnd(22),
    `duck ${stats.duckmin.toFixed(1)}–${stats.duckmax.toFixed(1)}`.padEnd(18),
    `n=${stats.samples}`,
  ].join(' ')
}

/** Positive value means full mix is louder than melody-only (drums/FX bus energy). */
export function mixmelodybalanceDb(
  full: { overallrmsdb: number },
  melody: { overallrmsdb: number },
): number {
  return full.overallrmsdb - melody.overallrmsdb
}

export function formatmixbalanceline(
  fullid: string,
  melodyid: string,
  fullrms: number,
  melodyrms: number,
): string {
  const delta = fullrms - melodyrms
  return `${fullid} vs ${melodyid}: mix rms ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} dB over melody-only`
}
