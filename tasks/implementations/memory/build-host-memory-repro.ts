/**
 * Parse host memory debug NDJSON and emit a replay spec for e2e.
 *
 * Usage:
 *   yarn host-memory:repro:build
 *   yarn host-memory:repro:build -- .cursor/debug-9bae57.log
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.cwd()
const PROJECT = process.cwd()
const DEFAULT_LOG = path.join(PROJECT, '.cursor/debug-9bae57.log')
const OUT_JSON = path.join(PROJECT, 'ops/fixtures/e2e/host-memory-repro.json')
const OUT_SPEC = path.join(
  PROJECT,
  'ops/e2e/host-memory-repro-from-log.spec.ts',
)

type LogRow = {
  message?: string
  hypothesisId?: string
  data?: Record<string, unknown>
  timestamp?: number
}

type Rect = { x: number; y: number }

type ReproStep =
  | { kind: 'milestone'; name: string; ts: number }
  | { kind: 'inspect'; p1: Rect; p2: Rect; ts: number }
  | { kind: 'batchchars'; p1: Rect; p2: Rect; fingerprint?: string; ts: number }
  | {
      kind: 'charedit'
      field: string
      value: number
      before?: string
      after?: string
      ts: number
    }
  | { kind: 'memorypatch'; ok: boolean; opcount: number; ts: number }
  | { kind: 'hostdead'; err: string; ts: number }

type ReproSpec = {
  source: string
  generatedat: string
  steps: ReproStep[]
  inspectrect?: { p1: Rect; p2: Rect }
  chareditvalue?: number
}

function parseargs(): string {
  const argv = process.argv.slice(2)
  const pathidx = argv.indexOf('--')
  if (pathidx >= 0 && argv[pathidx + 1]) {
    return path.resolve(PROJECT, argv[pathidx + 1])
  }
  return DEFAULT_LOG
}

function readstring(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return fallback
}

function readpt(raw: unknown): Rect | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }
  const o = raw as { x?: unknown; y?: unknown }
  if (typeof o.x === 'number' && typeof o.y === 'number') {
    return { x: o.x, y: o.y }
  }
  return undefined
}

function buildsteps(rows: LogRow[]): ReproStep[] {
  const steps: ReproStep[] = []
  for (const row of rows) {
    const msg = row.message ?? ''
    const ts = row.timestamp ?? 0
    const data = row.data ?? {}

    if (msg === 'manual:milestone' || msg.startsWith('manual:')) {
      const name = readstring(data.name, msg)
      steps.push({ kind: 'milestone', name, ts })
      continue
    }

    if (msg === 'batch:chars') {
      const p1 = readpt(data.p1)
      const p2 = readpt(data.p2)
      const snap = data.snapshot as
        | { rect?: { fingerprint?: string } }
        | undefined
      if (p1 && p2) {
        steps.push({
          kind: 'batchchars',
          p1,
          p2,
          fingerprint: snap?.rect?.fingerprint,
          ts,
        })
      }
      continue
    }

    if (msg === 'charedit:setvalue') {
      const field = readstring(data.name ?? data.field, 'char')
      const value = Number(data.value ?? 0)
      const snap = data.snapshot as
        | { rect?: { fingerprint?: string } }
        | undefined
      steps.push({
        kind: 'charedit',
        field,
        value,
        before: snap?.rect?.fingerprint,
        ts,
      })
      continue
    }

    if (msg === 'charedit:setvalue:after') {
      const field = readstring(data.field, 'char')
      const value = Number(data.value ?? 0)
      const snap = data.snapshot as
        | { rect?: { fingerprint?: string } }
        | undefined
      steps.push({
        kind: 'charedit',
        field,
        value,
        after: snap?.rect?.fingerprint,
        ts,
      })
      continue
    }

    if (msg === 'memory:patch:ok' || msg === 'memory:patch:fail') {
      steps.push({
        kind: 'memorypatch',
        ok: msg === 'memory:patch:ok',
        opcount: Number(data.opcount ?? 0),
        ts,
      })
      continue
    }

    if (msg === 'host:sim:dead') {
      steps.push({
        kind: 'hostdead',
        err: readstring(data.err, ''),
        ts,
      })
    }
  }
  return steps
}

function pickinspectrect(
  steps: ReproStep[],
): { p1: Rect; p2: Rect } | undefined {
  for (const step of steps) {
    if (step.kind === 'batchchars') {
      return { p1: step.p1, p2: step.p2 }
    }
  }
  return undefined
}

function pickchareditvalue(steps: ReproStep[]): number | undefined {
  for (let i = steps.length - 1; i >= 0; --i) {
    const step = steps[i]
    if (step.kind === 'charedit' && step.field === 'char' && step.value > 0) {
      return step.value
    }
  }
  return undefined
}

function writespecfile(spec: ReproSpec): void {
  const inspect = spec.inspectrect
  const charedit = spec.chareditvalue ?? 65
  const p1 = inspect?.p1 ?? { x: 4, y: 11 }
  const p2 = inspect?.p2 ?? { x: 6, y: 13 }

  const body = `import { expect, test } from '@playwright/test'

import repro from '../fixtures/e2e/host-memory-repro.json'
import type { ZssE2eBridge } from '../../zss/testsupport/e2escrollbridge'

import {
  bootstraphostpage,
  bootstrapjoinpage,
  makedatadir,
  waitjoinboardrunnerrun,
} from './helpers/joinmove'

type WindowWithE2e = Window & { __zss_e2e?: ZssE2eBridge }

const INSPECT_P1 = { x: ${p1.x}, y: ${p1.y} }
const INSPECT_P2 = { x: ${p2.x}, y: ${p2.y} }
const PICKED_CHAR = ${charedit}

/** Auto-generated from ${spec.source} at ${spec.generatedat} */
test.describe('host memory repro from log', () => {
  test.describe.configure({ timeout: 300_000 })

  test('replay logged join charedit sequence', async ({ page: host }) => {
    test.skip(!process.env.PLAYWRIGHT_HOST_MEMORY_REPRO, 'Set PLAYWRIGHT_HOST_MEMORY_REPRO=1')

    const datadir = makedatadir('zss-host-memory-repro-')
    const topic = await bootstraphostpage(host, datadir)

    const join = await host.context().newPage()
    await bootstrapjoinpage(join, topic)
    await waitjoinboardrunnerrun(join)

    await join.evaluate(() => {
      ;(window as WindowWithE2e).__zss_e2e!.enableinspector(true)
    })
    await expect
      .poll(
        async () =>
          join.evaluate(() =>
            (window as WindowWithE2e).__zss_e2e!.inspectorenabled(),
          ),
        { timeout: 30_000 },
      )
      .toBe(true)

    await join.evaluate(
      ({ p1, p2 }) => {
        ;(window as WindowWithE2e).__zss_e2e!.runinspect(p1, p2)
      },
      { p1: INSPECT_P1, p2: INSPECT_P2 },
    )

    await expect
      .poll(
        async () =>
          join.evaluate(() => {
            return (window as WindowWithE2e).__zss_e2e!.getscrollsnapshot()
              .scrollname
          }),
        { timeout: 60_000 },
      )
      .toBe('inspect')

    const batchchip = await join.evaluate(
      ({ p1, p2 }) => {
        const e2e = (window as WindowWithE2e).__zss_e2e!
        e2e.sendbatchchip(\`chars:\${p1.x},\${p1.y},\${p2.x},\${p2.y}\`)
        return e2e.batchchipforrect(p1, p2)
      },
      { p1: INSPECT_P1, p2: INSPECT_P2 },
    )

    await expect
      .poll(
        async () =>
          join.evaluate(({ chip }) => {
            const snap = (window as WindowWithE2e).__zss_e2e!.getscrollsnapshot()
            return snap.lines.some((line) => line.includes(chip))
          }, { chip: batchchip }),
        { timeout: 60_000 },
      )
      .toBe(true)

    await join.evaluate(
      ({ chip, value }) => {
        const e2e = (window as WindowWithE2e).__zss_e2e!
        e2e.writepanelnumber(chip, 'char', value)
      },
      { chip: batchchip, value: PICKED_CHAR },
    )

    await join.evaluate(() => {
      ;(window as WindowWithE2e).__zss_e2e!.sendmoveinput('right')
    })

    await expect
      .poll(
        async () =>
          host.evaluate(() =>
            (window as WindowWithE2e).__zss_e2e!.hostsimalive(),
          ),
        { timeout: 30_000 },
      )
      .toBe(true)

    const hostdead = repro.steps.some((s) => s.kind === 'hostdead')
    if (hostdead) {
      console.warn('Source log recorded host:sim:dead — replay expects corruption')
    }
  })
})
`

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true })
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(spec, null, 2)}\n`)
  fs.writeFileSync(OUT_SPEC, body)
}

function main(): void {
  const logpath = parseargs()
  if (!fs.existsSync(logpath)) {
    console.error(`Log not found: ${logpath}`)
    console.error('Run manual repro first: yarn e2e:manual:join-charedit')
    process.exit(1)
  }

  const lines = fs
    .readFileSync(logpath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
  const rows: LogRow[] = []
  for (const line of lines) {
    try {
      rows.push(JSON.parse(line) as LogRow)
    } catch {
      // skip malformed
    }
  }

  const steps = buildsteps(rows)
  const spec: ReproSpec = {
    source: path.relative(PROJECT, logpath),
    generatedat: new Date().toISOString(),
    steps,
    inspectrect: pickinspectrect(steps),
    chareditvalue: pickchareditvalue(steps),
  }

  writespecfile(spec)

  console.log(`Parsed ${rows.length} log lines → ${steps.length} repro steps`)
  console.log(`Wrote ${path.relative(PROJECT, OUT_JSON)}`)
  console.log(`Wrote ${path.relative(PROJECT, OUT_SPEC)}`)
  if (spec.inspectrect) {
    console.log(
      `Inspect rect: (${spec.inspectrect.p1.x},${spec.inspectrect.p1.y})-(${spec.inspectrect.p2.x},${spec.inspectrect.p2.y})`,
    )
  }
  if (spec.chareditvalue != null) {
    console.log(`Charedit value: ${spec.chareditvalue}`)
  }
  const dead = steps.filter((s) => s.kind === 'hostdead')
  if (dead.length) {
    console.log(`Host sim death events: ${dead.length}`)
  }
}

main()
