/**
 * Mandatory regression gates for VM boot vs task drop perf work.
 * Used by Jest and headed Playwright validators — any perf change must pass all gates.
 */

export type WanixBootPath = 'vm' | 'coldtask' | 'warmtask'

export type WanixBootRegressionGate = {
  path: WanixBootPath
  label: string
  /** Console substring or perf mark that must appear on success */
  signals: string[]
  /** Perf marks that must not exceed this ms (optional; browser captures only) */
  maxphasems?: Record<string, number>
}

export const WANIX_BOOT_REGRESSION_GATES: WanixBootRegressionGate[] = [
  {
    path: 'vm',
    label: 'VM boot: #wanix vm → zedcafe-books lists books',
    signals: ['[wanix-perf] synczedcafeexport-end', 'zedcafe-books'],
    maxphasems: {
      'synczedcafeexport-end': 15_000,
    },
  },
  {
    path: 'coldtask',
    label: 'Cold task: idle drop findplayers → JSON array line',
    signals: ['daemon start memcount=1', '[wanix-perf] spawntask-return', '["'],
    maxphasems: {
      'activate-export-end': 20_000,
      'synczedcafeexport-end': 15_000,
    },
  },
  {
    path: 'warmtask',
    label: 'Warm task: findplayers while wanix active → sync-stale skip',
    signals: ['sync-stale needed=false', '[wanix-perf] spawntask-return', '["'],
  },
]

export type WanixPerfTimelineEntry = {
  label: string
  extra?: Record<string, unknown>
  sinceanchor?: number
  elapsedms?: number
}

export function parsewanixperflines(lines: string[]): WanixPerfTimelineEntry[] {
  const entries: WanixPerfTimelineEntry[] = []
  const re = /\[wanix-perf\] (\S+)(?: (.+))?$/
  for (let i = 0; i < lines.length; i++) {
    const match = re.exec(lines[i])
    if (!match) {
      continue
    }
    let extra: Record<string, unknown> | undefined
    if (match[2]) {
      try {
        extra = JSON.parse(match[2]) as Record<string, unknown>
      } catch {
        extra = { raw: match[2] }
      }
    }
    const sinceanchor =
      typeof extra?.sinceanchor === 'number' ? extra.sinceanchor : undefined
    const elapsedms =
      typeof extra?.elapsedms === 'number' ? extra.elapsedms : undefined
    entries.push({
      label: match[1],
      extra,
      sinceanchor,
      elapsedms,
    })
  }
  return entries
}

export function assesswanixbootregression(
  path: WanixBootPath,
  loglines: string[],
  perflines?: string[],
): { ok: boolean; gate: WanixBootRegressionGate; missing: string[] } {
  const gate = WANIX_BOOT_REGRESSION_GATES.find((item) => item.path === path)
  if (!gate) {
    return {
      ok: false,
      gate: {
        path,
        label: 'unknown',
        signals: [],
      },
      missing: ['unknown gate path'],
    }
  }
  const haystack = [...loglines, ...(perflines ?? [])].join('\n')
  const missing: string[] = []
  for (let i = 0; i < gate.signals.length; i++) {
    const signal = gate.signals[i]
    if (!haystack.includes(signal)) {
      missing.push(signal)
    }
  }
  if (gate.maxphasems && perflines) {
    const timeline = parsewanixperflines(perflines)
    for (const [mark, budget] of Object.entries(gate.maxphasems)) {
      const entry = timeline.find((item) => item.label === mark)
      const ms = entry?.sinceanchor ?? entry?.elapsedms
      if (typeof ms === 'number' && ms > budget) {
        missing.push(`${mark} exceeded ${budget}ms (was ${ms}ms)`)
      }
    }
  }
  return { ok: missing.length === 0, gate, missing }
}

/**
 * Agent sync latency paths and SLO budgets (ms), tracked separately from
 * `WANIX_BOOT_REGRESSION_GATES` since these gate ongoing sync latency, not
 * one-shot boot signals. Sim<->guest legs must stay sub-200ms; the
 * peer->sim end-to-end leg (network hop included) budgets sub-400ms.
 */
export type WanixAgentLatencyPath =
  | 'sim-to-guest'
  | 'guest-to-sim'
  | 'sim-to-peer'
  | 'peer-to-sim'

export const WANIX_AGENT_LATENCY_SLOS: Record<WanixAgentLatencyPath, number> = {
  'sim-to-guest': 200,
  'guest-to-sim': 200,
  'sim-to-peer': 200,
  'peer-to-sim': 400,
}

/**
 * Agent workload profiles used to shape latency sample collection:
 * - singlefile: one object write/read round trip
 * - batchobjects: many objects touched in one sync tick
 * - structuraldelete: board/layer structural removal (not a plain object write)
 */
export type WanixAgentWorkloadProfile =
  | 'singlefile'
  | 'batchobjects'
  | 'structuraldelete'

export const WANIX_AGENT_WORKLOAD_PROFILES: WanixAgentWorkloadProfile[] = [
  'singlefile',
  'batchobjects',
  'structuraldelete',
]

/** Nearest-rank percentile (p in 0..100) over an unsorted ms sample array. */
export function percentilems(samples: number[], p: number): number {
  if (samples.length === 0) {
    return 0
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const rank = Math.ceil((p / 100) * sorted.length)
  const idx = Math.min(Math.max(rank - 1, 0), sorted.length - 1)
  return sorted[idx]
}

/**
 * Assess collected latency samples (ms, keyed by `WanixAgentLatencyPath`)
 * against `WANIX_AGENT_LATENCY_SLOS`. A path with no samples is reported as
 * missing rather than silently passing.
 */
export function assessagentlatencyslos(samples: Record<string, number[]>): {
  ok: boolean
  missing: string[]
  report: Record<string, { p50: number; p95: number; budget: number }>
} {
  const missing: string[] = []
  const report: Record<string, { p50: number; p95: number; budget: number }> =
    {}
  for (const [gatepath, budget] of Object.entries(WANIX_AGENT_LATENCY_SLOS)) {
    const values = samples[gatepath] ?? []
    if (values.length === 0) {
      missing.push(`${gatepath}: no samples`)
      continue
    }
    const p50 = percentilems(values, 50)
    const p95 = percentilems(values, 95)
    report[gatepath] = { p50, p95, budget }
    if (p95 > budget) {
      missing.push(`${gatepath} p95 exceeded ${budget}ms (was ${p95}ms)`)
    }
  }
  return { ok: missing.length === 0, missing, report }
}
