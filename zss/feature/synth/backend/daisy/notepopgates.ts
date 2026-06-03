import type { LEVEL_STABILITY_METRICS } from '../wasm/levelstabilitymetrics.ts'

export const NOTEPOP_GATE_MIN_PEAK_DB = -40
export const NOTEPOP_GATE_LEVEL_PARITY_MAX_DB = 6
export const NOTEPOP_GATE_NOTEON_SPIKE_MAX_DB = 3
export const NOTEPOP_GATE_POP_OFFSET_SEC = 0.055

export type NOTEPOP_META = {
  gateboundariessec: number[]
}

export type NOTEPOP_GATE_RESULT = {
  id: string
  pass: boolean
  detail: string
}

export type NOTEPOP_GATE_REPORT = {
  pass: boolean
  failures: string[]
  results: NOTEPOP_GATE_RESULT[]
  summary: string
}

export type NOTEPOP_RENDER_METRICS = {
  metrics: LEVEL_STABILITY_METRICS
}

function noteontimes(meta: NOTEPOP_META): number[] {
  const gates = meta.gateboundariessec
  const out: number[] = []
  for (let i = 0; i < gates.length; i += 2) {
    out.push(gates[i])
  }
  return out
}

export function notepoppopwindowindex(
  noteonsec: number,
  windowms: number,
  offsetsec = NOTEPOP_GATE_POP_OFFSET_SEC,
): number {
  return Math.floor(((noteonsec + offsetsec) * 1000) / windowms)
}

export function windowpeakdb(
  metrics: LEVEL_STABILITY_METRICS,
  index: number,
): number | undefined {
  if (index < 0 || index >= metrics.windowpeaksDb.length) {
    return undefined
  }
  return metrics.windowpeaksDb[index]
}

export function evalnotepopgates(
  compon: NOTEPOP_RENDER_METRICS,
  compoff: NOTEPOP_RENDER_METRICS,
  meta: NOTEPOP_META,
): NOTEPOP_GATE_REPORT {
  const results: NOTEPOP_GATE_RESULT[] = []
  const failures: string[] = []

  function record(id: string, pass: boolean, detail: string) {
    results.push({ id, pass, detail })
    if (!pass) {
      failures.push(`${id}: ${detail}`)
    }
  }

  const offpeak = compoff.metrics.overallpeakdb
  record(
    'render_sanity',
    offpeak > NOTEPOP_GATE_MIN_PEAK_DB,
    `comp-off overall peak ${offpeak.toFixed(1)} dBFS (min ${NOTEPOP_GATE_MIN_PEAK_DB} dBFS)`,
  )

  const onpeak = compon.metrics.overallpeakdb
  const leveldelta = onpeak - offpeak
  record(
    'level_parity',
    Math.abs(leveldelta) <= NOTEPOP_GATE_LEVEL_PARITY_MAX_DB,
    `comp-on ${onpeak.toFixed(1)} vs comp-off ${offpeak.toFixed(1)} dBFS (Δ ${leveldelta >= 0 ? '+' : ''}${leveldelta.toFixed(1)} dB, max ±${NOTEPOP_GATE_LEVEL_PARITY_MAX_DB} dB)`,
  )

  const windowms = compon.metrics.windowms
  for (const noteon of noteontimes(meta)) {
    const idx = notepoppopwindowindex(noteon, windowms)
    const onwin = windowpeakdb(compon.metrics, idx)
    const offwin = windowpeakdb(compoff.metrics, idx)
    const label = `t=${noteon.toFixed(3)}s win=${idx}`

    if (onwin === undefined || offwin === undefined) {
      record('noteon_pop_spike', false, `${label} missing window peak`)
      continue
    }

    const spikeover = onwin - offwin
    record(
      'noteon_pop_spike',
      spikeover <= NOTEPOP_GATE_NOTEON_SPIKE_MAX_DB,
      `${label} comp-on ${onwin.toFixed(1)} dBFS vs comp-off ${offwin.toFixed(1)} dBFS (Δ ${spikeover >= 0 ? '+' : ''}${spikeover.toFixed(1)} dB, max +${NOTEPOP_GATE_NOTEON_SPIKE_MAX_DB} dB hotter)`,
    )
  }

  const pass = failures.length === 0
  const passed = results.filter((row) => row.pass).length
  return {
    pass,
    failures,
    results,
    summary: pass
      ? `all ${results.length} notepop gates passed`
      : `${passed}/${results.length} gates passed; ${failures.length} failed`,
  }
}

export function formatnotepopgatereport(report: NOTEPOP_GATE_REPORT): string {
  const lines = ['Notepop compressor gates:']
  for (const row of report.results) {
    lines.push(`  ${row.pass ? 'PASS' : 'FAIL'}  ${row.id}: ${row.detail}`)
  }
  lines.push('', report.summary)
  return lines.join('\n')
}
