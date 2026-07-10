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
    signals: [
      '[wanix-perf] synczedcafeexport-end',
      'zedcafe-books',
    ],
    maxphasems: {
      'synczedcafeexport-end': 15_000,
    },
  },
  {
    path: 'coldtask',
    label: 'Cold task: idle drop findplayers → JSON array line',
    signals: [
      'daemon start memcount=1',
      '[wanix-perf] spawntask-return',
      '["',
    ],
    maxphasems: {
      'activate-export-end': 20_000,
      'synczedcafeexport-end': 15_000,
    },
  },
  {
    path: 'warmtask',
    label: 'Warm task: findplayers while wanix active → sync-stale skip',
    signals: [
      'sync-stale needed=false',
      '[wanix-perf] spawntask-return',
      '["',
    ],
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
    const match = lines[i].match(re)
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
