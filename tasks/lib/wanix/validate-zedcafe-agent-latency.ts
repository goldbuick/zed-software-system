import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { WANIX_PUBLIC_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import {
  dropwanixwasm,
  writescenarioreport,
} from 'tasks/lib/wanix/playwrighthelpers'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import {
  type ZedcafeTimelineEntry,
  importfixturebookinpage,
  polliswanixready,
  polluntil,
  readmembookcountinpage,
  readplaywrightlogs,
} from 'tasks/lib/wanix/playwrightzedcafe'
import {
  WANIX_AGENT_LATENCY_SLOS,
  WANIX_AGENT_WORKLOAD_PROFILES,
  type WanixAgentLatencyPath,
  assessagentlatencyslos,
} from 'zss/feature/wanix/wanixbootregression'
import { WANIX_ZEDCAFE_EXPORT_READY_POLL_MS } from 'zss/feature/wanix/wanixzedcafeconstants'

/**
 * Phase 0 baseline collector for the Zedcafe+Zedsync agent sync latency SLOs
 * (`WANIX_AGENT_LATENCY_SLOS` in `zss/feature/wanix/wanixbootregression.ts`).
 *
 * Drives the existing greenring `singlefile` workload (drop -> guest pull ->
 * guest paint -> host import) and derives sim<->guest samples from console
 * arrival timestamps of the marks it already emits:
 *   - sim-to-guest: drop issued -> `[wanix-perf] drop-export-pull-end`
 *   - guest-to-sim: guest `{"painted":N}` -> `zedcafe import: synced`
 *
 * Peer legs (`sim-to-peer` / `peer-to-sim`) require a running zedsync peer
 * (see `validate-zedsync-remote.ts` + `ops:fixtures:wanix:p9server:dev`) and
 * are not driven by this script. They are reported as `measured: false` so
 * `assessagentlatencyslos` output documents what still needs instrumentation
 * rather than silently omitting it.
 */

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const EXPORT_POLL_MS = WANIX_ZEDCAFE_EXPORT_READY_POLL_MS
const GREENRING_WASM = path.join(WANIX_PUBLIC_FIXTURES_DIR, 'greenring.wasm')
const FIXTURE_BOOK_PATH = path.join(
  process.cwd(),
  'ops/fixtures/books/example-coolregionsbow.book.json',
)
const USE_FIXTURE_BOOK = process.env.ZEDCAFE_VALIDATE_FIXTURE === '1'
const REPORT_PATH = '/tmp/wanix-zedcafe-agent-latency-report.json'
const BASELINE_REPORT_RELPATH =
  'ops/fixtures/wanix/reports/agent-latency-baseline.json'
const GREENRING_BUDGET_MS = 90_000

const PAINTED_RE = /\{"painted":\d+\}/
const IMPORT_SYNCED_RE = /zedcafe import: synced/
const PULL_START_RE = /\[wanix-perf\] drop-export-pull-start/
const PULL_END_RE = /\[wanix-perf\] drop-export-pull-end/

type StampedLine = { ms: number; line: string }

function firstmatch(lines: StampedLine[], re: RegExp): StampedLine | null {
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i].line)) {
      return lines[i]
    }
  }
  return null
}

const validatezedcafeagentlatency: HeadedPlaywrightScript = async ({
  page,
  baseurl,
  root,
}) => {
  const start = Date.now()
  const timeline: ZedcafeTimelineEntry[] = []
  const consolelines: string[] = []
  const stamped: StampedLine[] = []
  let membookcount = 0

  const record = (label: string, extra?: Record<string, unknown>) => {
    timeline.push({ ms: Date.now() - start, label, extra })
  }

  const pushstamped = (line: string) => {
    const ms = Date.now() - start
    consolelines.push(line)
    stamped.push({ ms, line })
  }

  await page.addInitScript(() => {
    const g = globalThis as {
      __nodeLog?: (line: string) => void
      __playwrightLogs?: string[]
    }
    g.__playwrightLogs = []
    g.__nodeLog = (line: string) => {
      g.__playwrightLogs?.push(line)
    }
  })

  page.on('console', (msg) => {
    pushstamped(`[${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', (err) => {
    pushstamped(`[pageerror] ${err.message}`)
  })

  const writereports = (
    samples: Record<WanixAgentLatencyPath, number[]>,
    extra: Record<string, unknown>,
  ) => {
    const assess = assessagentlatencyslos(samples)
    const report = {
      ok: assess.ok,
      workloadprofiles: WANIX_AGENT_WORKLOAD_PROFILES,
      budgets: WANIX_AGENT_LATENCY_SLOS,
      samples,
      slo: assess.report,
      missing: assess.missing,
      timeline,
      membookcount,
      extra,
    }
    writescenarioreport(REPORT_PATH, report)
    const baselinedir = path.join(root, path.dirname(BASELINE_REPORT_RELPATH))
    mkdirSync(baselinedir, { recursive: true })
    writescenarioreport(path.join(root, BASELINE_REPORT_RELPATH), report)
    return report
  }

  const fail = (gate: string, extra: Record<string, unknown> = {}): never => {
    writereports(
      {
        'sim-to-guest': [],
        'guest-to-sim': [],
        'sim-to-peer': [],
        'peer-to-sim': [],
      },
      { failedgate: gate, recentlogs: consolelines.slice(-160), ...extra },
    )
    throw new Error(`wanix agent latency validator failed at gate: ${gate}`)
  }

  await page.goto(baseurl, {
    waitUntil: 'load',
    timeout: VALIDATE_TIMEOUT_MS,
  })
  record('page-loaded')

  await waitforregistersession(page, root)
  record('register-session')
  await polliswanixready(page, VALIDATE_TIMEOUT_MS)
  record('wanix-ready')

  if (USE_FIXTURE_BOOK) {
    const bookjson = readFileSync(FIXTURE_BOOK_PATH, 'utf8')
    membookcount = await importfixturebookinpage(page, root, bookjson)
  } else {
    const booksloaded = await polluntil(
      'login-books-loaded',
      GREENRING_BUDGET_MS,
      EXPORT_POLL_MS,
      async () => {
        const bookcount = await readmembookcountinpage(page, root)
        return { ready: bookcount >= 1, bookcount }
      },
      (snap) => snap.ready === true,
    )
    membookcount = booksloaded.bookcount
  }
  record('books-loaded', { membookcount })
  if (membookcount < 1) {
    fail('books-loaded', {
      membookcount,
      hint: 'pass book URL hash or ZEDCAFE_VALIDATE_FIXTURE=1',
    })
  }

  const dropissuedms = Date.now() - start
  await dropwanixwasm(page, root, GREENRING_WASM, 'greenring.wasm')
  record('greenring-drop', { workload: 'singlefile' })

  let outcome: {
    ready: boolean
    painted: boolean
    guestdiff: boolean
    imported: boolean
  }
  try {
    outcome = await withscripttimeout(
      'greenring-import',
      GREENRING_BUDGET_MS,
      async () =>
        polluntil(
          'greenring-import',
          GREENRING_BUDGET_MS,
          EXPORT_POLL_MS,
          async () => {
            const tapelogs = await readplaywrightlogs(page).catch(() => [])
            const joined = [...consolelines, ...tapelogs].join('\n')
            const painted = PAINTED_RE.test(joined)
            const guestdiff = joined.includes('poll-guest-diff=true')
            const imported = joined.includes('zedcafe import: synced')
            return {
              ready: painted && guestdiff && imported,
              painted,
              guestdiff,
              imported,
            }
          },
          (snap) => snap.ready === true,
        ),
    )
  } catch (err) {
    // Best-effort baseline: a greenring timeout still yields a partial
    // report (missing samples) instead of losing whatever marks landed.
    outcome = {
      ready: false,
      painted: false,
      guestdiff: false,
      imported: false,
    }
    record('greenring-import-timeout', {
      error: err instanceof Error ? err.message : String(err),
    })
  }
  record('greenring-import', outcome)

  const pullstart = firstmatch(stamped, PULL_START_RE)
  const pullend = firstmatch(stamped, PULL_END_RE)
  const painted = firstmatch(stamped, PAINTED_RE)
  const imported = firstmatch(stamped, IMPORT_SYNCED_RE)

  const simtoguest: number[] = []
  if (pullend) {
    simtoguest.push(Math.max(0, pullend.ms - dropissuedms))
  }
  const guesttosim: number[] = []
  if (painted && imported && imported.ms >= painted.ms) {
    guesttosim.push(imported.ms - painted.ms)
  }

  const samples: Record<WanixAgentLatencyPath, number[]> = {
    'sim-to-guest': simtoguest,
    'guest-to-sim': guesttosim,
    'sim-to-peer': [],
    'peer-to-sim': [],
  }

  const report = writereports(samples, {
    outcome,
    dropissuedms,
    marks: {
      pullstart: pullstart?.ms ?? null,
      pullend: pullend?.ms ?? null,
      painted: painted?.ms ?? null,
      imported: imported?.ms ?? null,
    },
    measured: {
      'sim-to-guest': simtoguest.length > 0,
      'guest-to-sim': guesttosim.length > 0,
      'sim-to-peer': false,
      'peer-to-sim': false,
    },
    note: 'sim-to-peer/peer-to-sim not driven by this script; run validate-zedsync-remote.ts against a live peer for those legs.',
  })

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

export default validatezedcafeagentlatency
