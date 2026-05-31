/** Windowed loudness stats for diagnosing master-bus / FX level swings. */

const SILENT_DB = -120
const SILENCE_PEAK_DB = -60

export type LEVEL_WINDOW_STATS = {
  peakdb: number
  rmsdb: number
  crestdb: number
}

export type LEVEL_STABILITY_METRICS = {
  windows: number
  windowms: number
  activewindows: number
  silentwindows: number
  peakrangeDb: number
  rmsrangeDb: number
  peakstdDb: number
  rmsstdDb: number
  creststdDb: number
  overallpeakdb: number
  overallrmsdb: number
  windowpeaksDb: number[]
  windowrmsDb: number[]
  /** Middle active windows with attack/release trimmed (25% each end). */
  steadypeakrangeDb: number
  steadyrmsrangeDb: number
  steadypeakstdDb: number
  steadyrmsstdDb: number
  steadycwindows: number
}

export type LEVEL_STABILITY_COMPARE = {
  peakrangeDeltaDb: number
  rmsrangeDeltaDb: number
  peakstdDeltaDb: number
  rmsstdDeltaDb: number
  steadypeakrangeDeltaDb: number
  steadyrmsrangeDeltaDb: number
}

function lineartodb(value: number): number {
  return value > 0 ? 20 * Math.log10(value) : SILENT_DB
}

function windowstats(samples: Float32Array, start: number, end: number): LEVEL_WINDOW_STATS {
  let sumsq = 0
  let peak = 0
  const count = end - start
  for (let i = start; i < end; i++) {
    const s = samples[i]
    sumsq += s * s
    const abs = s < 0 ? -s : s
    if (abs > peak) {
      peak = abs
    }
  }
  const rms = count > 0 ? Math.sqrt(sumsq / count) : 0
  const peakdb = lineartodb(peak)
  const rmsdb = lineartodb(rms)
  const crestdb = peakdb > SILENT_DB + 1 && rmsdb > SILENT_DB + 1 ? peakdb - rmsdb : 0
  return { peakdb, rmsdb, crestdb }
}

function steadystats(
  windowpeaksDb: number[],
  windowrmsDb: number[],
): Pick<
  LEVEL_STABILITY_METRICS,
  | 'steadypeakrangeDb'
  | 'steadyrmsrangeDb'
  | 'steadypeakstdDb'
  | 'steadyrmsstdDb'
  | 'steadycwindows'
> {
  const activeidx: number[] = []
  for (let i = 0; i < windowpeaksDb.length; i++) {
    if (windowpeaksDb[i] > SILENCE_PEAK_DB) {
      activeidx.push(i)
    }
  }
  if (activeidx.length < 6) {
    return {
      steadypeakrangeDb: 0,
      steadyrmsrangeDb: 0,
      steadypeakstdDb: 0,
      steadyrmsstdDb: 0,
      steadycwindows: 0,
    }
  }
  const trim = Math.max(1, Math.floor(activeidx.length * 0.25))
  const trimmed = activeidx.slice(trim, activeidx.length - trim)
  const peaks = trimmed.map((idx) => windowpeaksDb[idx])
  const rms = trimmed.map((idx) => windowrmsDb[idx])
  const peakmin = Math.min(...peaks)
  const peakmax = Math.max(...peaks)
  const rmsmin = Math.min(...rms)
  const rmsmax = Math.max(...rms)
  return {
    steadypeakrangeDb: peakmax - peakmin,
    steadyrmsrangeDb: rmsmax - rmsmin,
    steadypeakstdDb: stddev(peaks),
    steadyrmsstdDb: stddev(rms),
    steadycwindows: trimmed.length,
  }
}

function stddev(values: number[]): number {
  if (values.length < 2) {
    return 0
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - mean
    sum += d * d
  }
  return Math.sqrt(sum / values.length)
}

export function analyzelevelstability(
  samples: Float32Array,
  samplerate: number,
  windowms = 46,
): LEVEL_STABILITY_METRICS {
  const windowsize = Math.max(64, Math.round((samplerate * windowms) / 1000))
  const windowpeaksDb: number[] = []
  const windowrmsDb: number[] = []
  const crests: number[] = []

  for (let start = 0; start < samples.length; start += windowsize) {
    const end = Math.min(samples.length, start + windowsize)
    const stats = windowstats(samples, start, end)
    windowpeaksDb.push(stats.peakdb)
    windowrmsDb.push(stats.rmsdb)
    if (stats.peakdb > SILENCE_PEAK_DB) {
      crests.push(stats.crestdb)
    }
  }

  const activepeaks = windowpeaksDb.filter((db) => db > SILENCE_PEAK_DB)
  const activerms = windowrmsDb.filter((db) => db > SILENCE_PEAK_DB)
  const silentwindows = windowpeaksDb.length - activepeaks.length

  const peakmin = activepeaks.length > 0 ? Math.min(...activepeaks) : SILENT_DB
  const peakmax = activepeaks.length > 0 ? Math.max(...activepeaks) : SILENT_DB
  const rmsmin = activerms.length > 0 ? Math.min(...activerms) : SILENT_DB
  const rmsmax = activerms.length > 0 ? Math.max(...activerms) : SILENT_DB

  const overall = windowstats(samples, 0, samples.length)
  const steady = steadystats(windowpeaksDb, windowrmsDb)

  return {
    windows: windowpeaksDb.length,
    windowms,
    activewindows: activepeaks.length,
    silentwindows,
    peakrangeDb: activepeaks.length > 1 ? peakmax - peakmin : 0,
    rmsrangeDb: activerms.length > 1 ? rmsmax - rmsmin : 0,
    peakstdDb: stddev(activepeaks),
    rmsstdDb: stddev(activerms),
    creststdDb: stddev(crests),
    overallpeakdb: overall.peakdb,
    overallrmsdb: overall.rmsdb,
    windowpeaksDb,
    windowrmsDb,
    ...steady,
  }
}

export function comparelevelstability(
  baseline: LEVEL_STABILITY_METRICS,
  candidate: LEVEL_STABILITY_METRICS,
): LEVEL_STABILITY_COMPARE {
  return {
    peakrangeDeltaDb: candidate.peakrangeDb - baseline.peakrangeDb,
    rmsrangeDeltaDb: candidate.rmsrangeDb - baseline.rmsrangeDb,
    peakstdDeltaDb: candidate.peakstdDb - baseline.peakstdDb,
    rmsstdDeltaDb: candidate.rmsstdDb - baseline.rmsstdDb,
    steadypeakrangeDeltaDb:
      candidate.steadypeakrangeDb - baseline.steadypeakrangeDb,
    steadyrmsrangeDeltaDb:
      candidate.steadyrmsrangeDb - baseline.steadyrmsrangeDb,
  }
}

export function formatlevelstabilityline(
  id: string,
  metrics: LEVEL_STABILITY_METRICS,
): string {
  return [
    id.padEnd(28),
    `spkΔ ${metrics.steadypeakrangeDb.toFixed(1)} dB`.padEnd(17),
    `srmsΔ ${metrics.steadyrmsrangeDb.toFixed(1)} dB`.padEnd(16),
    `spkσ ${metrics.steadypeakstdDb.toFixed(1)} dB`.padEnd(17),
    `pk ${metrics.overallpeakdb.toFixed(1)} dB`.padEnd(14),
    `steady ${metrics.steadycwindows}/${metrics.activewindows}`,
  ].join(' ')
}

const SPARK_CHARS = ' .·:-=+*#@'

function sparkvalue(db: number, min: number, max: number): string {
  if (max <= min) {
    return SPARK_CHARS[0]
  }
  const t = (db - min) / (max - min)
  const idx = Math.max(0, Math.min(SPARK_CHARS.length - 1, Math.round(t * (SPARK_CHARS.length - 1))))
  return SPARK_CHARS[idx]
}

function activewindowindices(metrics: LEVEL_STABILITY_METRICS): number[] {
  const out: number[] = []
  for (let i = 0; i < metrics.windowpeaksDb.length; i++) {
    if (metrics.windowpeaksDb[i] > SILENCE_PEAK_DB) {
      out.push(i)
    }
  }
  return out
}

/** Side-by-side ASCII sparklines of window peak dB (active windows only). */
export function formatwindowcompareplot(
  labela: string,
  labelb: string,
  metricsa: LEVEL_STABILITY_METRICS,
  metricsb: LEVEL_STABILITY_METRICS,
  maxrows = 48,
): string {
  const idxa = activewindowindices(metricsa)
  const idxb = activewindowindices(metricsb)
  const count = Math.min(idxa.length, idxb.length)
  if (count === 0) {
    return 'no active windows to compare'
  }
  const step = Math.max(1, Math.ceil(count / maxrows))
  const peaks: number[] = []
  for (let i = 0; i < count; i += step) {
    peaks.push(metricsa.windowpeaksDb[idxa[i]])
    peaks.push(metricsb.windowpeaksDb[idxb[i]])
  }
  const min = Math.min(...peaks)
  const max = Math.max(...peaks)
  const lines: string[] = [
    `Window peak dB (${metricsa.windowms} ms) — ${labela} vs ${labelb}`,
    `range ${min.toFixed(1)} … ${max.toFixed(1)} dB  (${SPARK_CHARS[0]} quiet → ${SPARK_CHARS[SPARK_CHARS.length - 1]} loud)`,
    'win'.padStart(5),
    labela.slice(0, 24).padEnd(26),
    labelb.slice(0, 24),
    '',
  ]
  let row = 0
  for (let i = 0; i < count; i += step) {
    const pa = metricsa.windowpeaksDb[idxa[i]]
    const pb = metricsb.windowpeaksDb[idxb[i]]
    const sparka = sparkvalue(pa, min, max)
    const sparkb = sparkvalue(pb, min, max)
    lines.push(
      `${String(row).padStart(5)}  ${sparka} ${pa.toFixed(1).padStart(6)} dB    ${sparkb} ${pb.toFixed(1).padStart(6)} dB`,
    )
    row += 1
  }
  return lines.join('\n')
}

export function diagnoselevelstability(
  results: Record<string, LEVEL_STABILITY_METRICS>,
  pairs: Array<[string, string]>,
): string[] {
  const lines: string[] = []
  for (const [baseid, candid] of pairs) {
    const base = results[baseid]
    const cand = results[candid]
    if (!base || !cand) {
      continue
    }
    const delta = comparelevelstability(base, cand)
    const spk = delta.steadypeakrangeDeltaDb
    const srms = delta.steadyrmsrangeDeltaDb
    lines.push(
      `${candid} vs ${baseid}: steady peak ${spk >= 0 ? '+' : ''}${spk.toFixed(1)} dB, steady rms ${srms >= 0 ? '+' : ''}${srms.toFixed(1)} dB`,
    )
  }
  return lines
}
