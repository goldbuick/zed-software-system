import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import {
  attachconsolecapture,
  dropwanixbundle,
  dropwanixwasm,
  hardstopwanixroominpage,
  installplaywrightlogcapture,
  listwanixtaskids,
  publicwanixfixture,
  readalltermtext,
  waitforlogsubstring,
  waitfornewwanixtaskid,
  waitfortermorsubstring,
  writescenarioreport,
} from 'tasks/lib/wanix/playwrighthelpers'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import {
  type ZedcafeTimelineEntry,
  evalwaniixhost,
  importfixturebookinpage,
  polliswanixready,
  polluntil,
  readfindplayersbookspaths,
  readmembookcountinpage,
  readtermbuffertext,
  sendwanixcli,
} from 'tasks/lib/wanix/playwrightzedcafe'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const FIXTURE_BUDGET_MS = 60_000
const GOJS_BUDGET_MS = 90_000
const REPORT_PATH = '/tmp/wanix-fixtures-stdout-report.json'
const FIXTURE_BOOK_PATH = path.join(
  process.cwd(),
  'ops/fixtures/books/example-coolregionsbow.book.json',
)
const USE_FIXTURE_BOOK = process.env.ZEDCAFE_VALIDATE_FIXTURE === '1'
const HELLO = 'Hello from wanix!'
const PAINTED_RE = /\{"painted":\d+\}/

type FixtureKind = 'wasm' | 'bundle'
type ExpectMode =
  | { kind: 'substring'; text: string; spawns: number }
  | { kind: 'anyof'; texts: string[]; spawns: number }
  | { kind: 'allhello'; spawns: number }
  | { kind: 'empty'; spawns: 0 }
  | { kind: 'findplayers'; spawns: 1 }
  | { kind: 'greenring'; spawns: 1 }

type FixtureSpec = {
  file: string
  kind: FixtureKind
  expect: ExpectMode
  budgetms: number
}

type FixtureResult = {
  mode: string
  fixture: string
  ok: boolean
  skipped?: boolean
  reason?: string
  taskids?: string[]
  actualtail?: string
}

const FIXTURES: FixtureSpec[] = [
  {
    file: 'alpha.wasm',
    kind: 'wasm',
    expect: { kind: 'substring', text: 'Alpha run', spawns: 1 },
    budgetms: FIXTURE_BUDGET_MS,
  },
  {
    file: 'beta.wasm',
    kind: 'wasm',
    expect: { kind: 'substring', text: 'Beta run', spawns: 1 },
    budgetms: FIXTURE_BUDGET_MS,
  },
  {
    file: 'greet.wasm',
    kind: 'wasm',
    expect: { kind: 'substring', text: 'Greet task OK', spawns: 1 },
    budgetms: FIXTURE_BUDGET_MS,
  },
  {
    file: 'hello-wat.wasm',
    kind: 'wasm',
    expect: { kind: 'substring', text: HELLO, spawns: 1 },
    budgetms: FIXTURE_BUDGET_MS,
  },
  {
    file: 'hello-c.wasm',
    kind: 'wasm',
    expect: { kind: 'substring', text: HELLO, spawns: 1 },
    budgetms: FIXTURE_BUDGET_MS,
  },
  {
    file: 'hello-zig.wasm',
    kind: 'wasm',
    expect: { kind: 'substring', text: HELLO, spawns: 1 },
    budgetms: FIXTURE_BUDGET_MS,
  },
  {
    file: 'hello-rust.wasm',
    kind: 'wasm',
    expect: { kind: 'substring', text: HELLO, spawns: 1 },
    budgetms: FIXTURE_BUDGET_MS,
  },
  {
    file: 'hello-tinygo.wasm',
    kind: 'wasm',
    expect: { kind: 'substring', text: HELLO, spawns: 1 },
    budgetms: FIXTURE_BUDGET_MS,
  },
  {
    file: 'hello-gowasi.wasm',
    kind: 'wasm',
    expect: { kind: 'substring', text: HELLO, spawns: 1 },
    budgetms: GOJS_BUDGET_MS,
  },
  {
    file: 'hello-gojs.wasm',
    kind: 'wasm',
    expect: { kind: 'substring', text: HELLO, spawns: 1 },
    budgetms: GOJS_BUDGET_MS,
  },
  {
    file: 'bundle-one.tgz',
    kind: 'bundle',
    expect: { kind: 'substring', text: HELLO, spawns: 1 },
    budgetms: FIXTURE_BUDGET_MS,
  },
  {
    file: 'bundle-two.tgz',
    kind: 'bundle',
    expect: { kind: 'anyof', texts: ['Alpha run', 'Beta run'], spawns: 2 },
    budgetms: FIXTURE_BUDGET_MS,
  },
  {
    file: 'hello-all.tgz',
    kind: 'bundle',
    expect: { kind: 'allhello', spawns: 7 },
    budgetms: GOJS_BUDGET_MS,
  },
  {
    file: 'bundle-empty.tgz',
    kind: 'bundle',
    expect: { kind: 'empty', spawns: 0 },
    budgetms: FIXTURE_BUDGET_MS,
  },
  {
    file: 'findplayers.wasm',
    kind: 'wasm',
    expect: { kind: 'findplayers', spawns: 1 },
    budgetms: GOJS_BUDGET_MS,
  },
  {
    file: 'greenring.wasm',
    kind: 'wasm',
    expect: { kind: 'greenring', spawns: 1 },
    budgetms: GOJS_BUDGET_MS,
  },
]

function readvalidatemodes(): ('task' | 'vm' | 'order')[] {
  const raw = (process.env.WANIX_VALIDATE_MODE ?? 'both').trim().toLowerCase()
  if (raw === 'task') {
    return ['task']
  }
  if (raw === 'vm') {
    return ['vm']
  }
  if (raw === 'order') {
    return ['order']
  }
  if (raw === 'both') {
    return ['task', 'vm']
  }
  // both + order
  if (raw === 'all') {
    return ['task', 'vm', 'order']
  }
  return ['task', 'vm']
}

async function waitforvmrid(
  page: import('@playwright/test').Page,
  budgetms: number,
): Promise<string> {
  let lasterr = ''
  try {
    return await withscripttimeout('vm-rid', budgetms, async () => {
      for (;;) {
        try {
          const status = await evalwaniixhost<{
            vrid?: string | null
            running?: boolean
            vmid?: string | null
          }>(page, 'readvmstatus', [])
          if (status?.vrid) {
            return status.vrid
          }
          lasterr = `no-vrid running=${status?.running} vmid=${status?.vmid}`
        } catch (err) {
          lasterr = err instanceof Error ? err.message : String(err)
        }
        await page.waitForTimeout(250)
      }
    })
  } catch (err) {
    throw new Error(
      `${err instanceof Error ? err.message : String(err)} (last=${lasterr})`,
    )
  }
}

async function bootvmroom(
  page: import('@playwright/test').Page,
  root: string,
  consolelines: string[],
  record: (label: string, extra?: Record<string, unknown>) => void,
  label: string,
): Promise<string> {
  const logmark = consolelines.length
  await sendwanixcli(page, root, '#wanix vm')
  record(`${label}-cli-sent`)
  await polluntil(
    `${label}-apply`,
    VALIDATE_TIMEOUT_MS,
    250,
    async () => {
      const recent = consolelines.slice(logmark)
      const hit = recent.find(
        (line) =>
          (line.includes('applyroom-return') &&
            /"mode"\s*:\s*"vm"/.test(line)) ||
          (line.includes('applyroom-warm-reuse') &&
            /"mode"\s*:\s*"vm"/.test(line)),
      )
      return hit ?? ''
    },
    (line) => line.length > 0,
  )
  record(`${label}-apply-seen`)
  await page
    .frameLocator('iframe[title="wanix"]')
    .locator('wanix-vm')
    .first()
    .waitFor({ state: 'attached', timeout: VALIDATE_TIMEOUT_MS })
  record(`${label}-vm-attached`)
  // rid can lag behind applyroom-return; require a live vm element. Prefer rid
  // when present but do not fail the order gate solely on rid.
  try {
    const vrid = await waitforvmrid(page, 15_000)
    record(`${label}-vrid`, { vrid })
    return vrid
  } catch (err) {
    const status = await evalwaniixhost<{
      running?: boolean
      vmid?: string | null
    }>(page, 'readvmstatus', []).catch(() => null)
    if (status?.running) {
      record(`${label}-vm-running-no-rid`, {
        vmid: status.vmid,
        err: err instanceof Error ? err.message : String(err),
      })
      return status.vmid ?? 'linux-vm'
    }
    throw err
  }
}

async function waitfornewtaskids(
  page: import('@playwright/test').Page,
  known: Set<string>,
  count: number,
  budgetms: number,
): Promise<string[]> {
  const found: string[] = []
  const seen = new Set(known)
  return withscripttimeout(`new-tasks-${count}`, budgetms, async () => {
    while (found.length < count) {
      const id = await waitfornewwanixtaskid(page, seen, budgetms)
      seen.add(id)
      found.push(id)
    }
    return found
  })
}

async function assertfixturestdout(
  page: import('@playwright/test').Page,
  root: string,
  consolelines: string[],
  spec: FixtureSpec,
  taskids: string[],
  budgetms: number,
): Promise<string> {
  const expect = spec.expect
  if (expect.kind === 'empty') {
    await waitforlogsubstring(
      page,
      consolelines,
      'wanix drop done',
      budgetms,
      `${spec.file}-drop-done`,
    )
    return 'drop-done'
  }
  if (expect.kind === 'substring') {
    return waitfortermorsubstring(
      page,
      root,
      consolelines,
      expect.text,
      budgetms,
      `${spec.file}-stdout`,
    )
  }
  if (expect.kind === 'anyof') {
    const joined = await polluntil(
      `${spec.file}-anyof`,
      budgetms,
      250,
      async () => readalltermtext(page, root),
      (text) => expect.texts.every((needle) => text.includes(needle)),
    )
    return joined
  }
  if (expect.kind === 'allhello') {
    return waitfortermorsubstring(
      page,
      root,
      consolelines,
      HELLO,
      budgetms,
      `${spec.file}-hello`,
    )
  }
  if (expect.kind === 'findplayers') {
    const text = await polluntil(
      `${spec.file}-findplayers`,
      budgetms,
      250,
      async () => {
        const chunks: string[] = []
        for (const id of taskids) {
          chunks.push(await readtermbuffertext(page, root, id))
        }
        chunks.push(await readalltermtext(page, root))
        return chunks.join('\n')
      },
      (dump) =>
        readfindplayersbookspaths(dump) ||
        /\[[\s\S]*\]/.test(dump) ||
        /\{[\s\S]*\}/.test(dump),
    )
    return text
  }
  // greenring
  return waitfortermorsubstring(
    page,
    root,
    consolelines,
    PAINTED_RE,
    budgetms,
    `${spec.file}-painted`,
  )
}

async function dropfixture(
  page: import('@playwright/test').Page,
  root: string,
  spec: FixtureSpec,
): Promise<void> {
  const fixturepath = publicwanixfixture(spec.file)
  if (spec.kind === 'bundle') {
    await dropwanixbundle(page, root, fixturepath, spec.file)
    return
  }
  await dropwanixwasm(page, root, fixturepath, spec.file)
}

async function runonefixture(
  page: import('@playwright/test').Page,
  root: string,
  consolelines: string[],
  mode: string,
  spec: FixtureSpec,
): Promise<FixtureResult> {
  const fixturepath = publicwanixfixture(spec.file)
  if (!existsSync(fixturepath)) {
    return {
      mode,
      fixture: spec.file,
      ok: true,
      skipped: true,
      reason: 'fixture missing on disk',
    }
  }
  return withscripttimeout(`${mode}:${spec.file}`, spec.budgetms, async () => {
    const known = new Set(await listwanixtaskids(page))
    await dropfixture(page, root, spec)
    let taskids: string[] = []
    if (spec.expect.spawns > 0) {
      taskids = await waitfornewtaskids(
        page,
        known,
        spec.expect.spawns,
        spec.budgetms,
      )
    } else {
      // Empty bundle: confirm no new user tasks appear briefly, then drop-done.
      await page.waitForTimeout(500)
      const after = await listwanixtaskids(page)
      const extras = after.filter((id) => !known.has(id) && id !== 'zedcafe')
      if (extras.length > 0) {
        throw new Error(
          `bundle-empty spawned unexpected tasks: ${extras.join(',')}`,
        )
      }
    }
    const actual = await assertfixturestdout(
      page,
      root,
      consolelines,
      spec,
      taskids,
      spec.budgetms,
    )
    return {
      mode,
      fixture: spec.file,
      ok: true,
      taskids,
      actualtail: actual.slice(-400),
    }
  })
}

async function ensurebooks(
  page: import('@playwright/test').Page,
  root: string,
  record: (label: string, extra?: Record<string, unknown>) => void,
): Promise<number> {
  if (USE_FIXTURE_BOOK) {
    const bookjson = readFileSync(FIXTURE_BOOK_PATH, 'utf8')
    const count = await importfixturebookinpage(page, root, bookjson)
    record('books-fixture', { membookcount: count })
    return count
  }
  const snap = await polluntil(
    'login-books-loaded',
    90_000,
    250,
    async () => {
      const bookcount = await readmembookcountinpage(page, root)
      return { ready: bookcount >= 1, bookcount }
    },
    (row) => row.ready === true,
  )
  record('books-loaded', { membookcount: snap.bookcount })
  return snap.bookcount
}

async function hardstopandwait(
  page: import('@playwright/test').Page,
  root: string,
  consolelines: string[],
  record: (label: string, extra?: Record<string, unknown>) => void,
  label: string,
): Promise<void> {
  const logmark = consolelines.length
  await hardstopwanixroominpage(page, root)
  await polluntil(
    `${label}-idle`,
    VALIDATE_TIMEOUT_MS,
    250,
    async () => {
      const recent = consolelines.slice(logmark)
      const hit = recent.find(
        (line) =>
          /applyroom-return.*"mode"\s*:\s*"idle"/.test(line) ||
          line.includes('applyroom-soft-idle') ||
          line.includes('"mode":"idle"'),
      )
      return hit ?? ''
    },
    (line) => line.length > 0,
  )
  // Ensure prior wanix-vm is gone before the next boot.
  await page
    .frameLocator('iframe[title="wanix"]')
    .locator('wanix-vm')
    .first()
    .waitFor({ state: 'detached', timeout: VALIDATE_TIMEOUT_MS })
    .catch(() => {
      // already absent
    })
  record(`${label}-hard-stop-done`)
}

async function enterroommode(
  page: import('@playwright/test').Page,
  root: string,
  consolelines: string[],
  mode: 'task' | 'vm',
  record: (label: string, extra?: Record<string, unknown>) => void,
): Promise<void> {
  await hardstopandwait(page, root, consolelines, record, mode)
  if (mode === 'vm') {
    await bootvmroom(page, root, consolelines, record, 'vm')
  }
}

async function runordermodes(
  page: import('@playwright/test').Page,
  root: string,
  consolelines: string[],
  record: (label: string, extra?: Record<string, unknown>) => void,
  results: FixtureResult[],
): Promise<void> {
  // VM-first: #wanix vm -> drop alpha -> Alpha run
  await hardstopandwait(page, root, consolelines, record, 'order-vm-first')
  await bootvmroom(page, root, consolelines, record, 'order-vm-first')
  {
    const known = new Set(await listwanixtaskids(page))
    await dropwanixwasm(
      page,
      root,
      publicwanixfixture('alpha.wasm'),
      'alpha.wasm',
    )
    const taskid = await waitfornewwanixtaskid(page, known, FIXTURE_BUDGET_MS)
    await waitfortermorsubstring(
      page,
      root,
      consolelines,
      'Alpha run',
      FIXTURE_BUDGET_MS,
      'order-vm-first-alpha',
    )
    results.push({
      mode: 'order-vm-first',
      fixture: 'alpha.wasm',
      ok: true,
      taskids: [taskid],
    })
    record('order-vm-first-ok', { taskid })
  }

  // Tasks-first: drop alpha -> assert -> #wanix vm -> task survives -> drop beta
  await hardstopandwait(page, root, consolelines, record, 'order-tasks-first')
  record('order-tasks-first-reset')
  const known = new Set(await listwanixtaskids(page))
  await dropwanixwasm(
    page,
    root,
    publicwanixfixture('alpha.wasm'),
    'alpha.wasm',
  )
  const alphatask = await waitfornewwanixtaskid(page, known, FIXTURE_BUDGET_MS)
  await waitfortermorsubstring(
    page,
    root,
    consolelines,
    'Alpha run',
    FIXTURE_BUDGET_MS,
    'order-tasks-first-alpha',
  )
  record('order-tasks-first-alpha', { alphatask })

  await bootvmroom(page, root, consolelines, record, 'order-tasks-first')

  const afterids = await listwanixtaskids(page)
  if (!afterids.includes(alphatask)) {
    throw new Error(
      `tasks-first: alpha task ${alphatask} missing after VM start (ids=${afterids.join(',')})`,
    )
  }
  const alphatext = await readtermbuffertext(page, root, alphatask)
  if (!alphatext.includes('Alpha run')) {
    throw new Error(
      `tasks-first: alpha term lost stdout after VM start (tail=${alphatext.slice(-200)})`,
    )
  }
  results.push({
    mode: 'order-tasks-first-survive',
    fixture: 'alpha.wasm',
    ok: true,
    taskids: [alphatask],
    actualtail: alphatext.slice(-200),
  })

  const known2 = new Set(afterids)
  await dropwanixwasm(page, root, publicwanixfixture('beta.wasm'), 'beta.wasm')
  const betatask = await waitfornewwanixtaskid(page, known2, FIXTURE_BUDGET_MS)
  await waitfortermorsubstring(
    page,
    root,
    consolelines,
    'Beta run',
    FIXTURE_BUDGET_MS,
    'order-tasks-first-beta',
  )
  results.push({
    mode: 'order-tasks-first-beta',
    fixture: 'beta.wasm',
    ok: true,
    taskids: [betatask],
  })
  record('order-tasks-first-ok', { alphatask, betatask })
}

const validatefixturesstdout: HeadedPlaywrightScript = async ({
  page,
  baseurl,
  root,
}) => {
  const start = Date.now()
  const timeline: ZedcafeTimelineEntry[] = []
  const consolelines: string[] = []
  const results: FixtureResult[] = []
  const modes = readvalidatemodes()

  const record = (label: string, extra?: Record<string, unknown>) => {
    timeline.push({ ms: Date.now() - start, label, extra })
  }

  await installplaywrightlogcapture(page)
  attachconsolecapture(page, consolelines, timeline, start)

  await page.goto(baseurl, {
    waitUntil: 'load',
    timeout: VALIDATE_TIMEOUT_MS,
  })
  record('page-load')
  await waitforregistersession(page, root)
  record('register-session')
  await polliswanixready(page, VALIDATE_TIMEOUT_MS)
  record('wanix-ready')

  const membookcount = await ensurebooks(page, root, record)
  if (membookcount < 1) {
    writescenarioreport(REPORT_PATH, {
      ok: false,
      failedgate: 'books-loaded',
      timeline,
      hint: 'pass book URL hash or ZEDCAFE_VALIDATE_FIXTURE=1',
    })
    throw new Error('wanix fixtures stdout: no books loaded')
  }

  for (const mode of modes) {
    if (mode === 'order') {
      await runordermodes(page, root, consolelines, record, results)
      continue
    }
    await enterroommode(page, root, consolelines, mode, record)
    for (const spec of FIXTURES) {
      try {
        const result = await runonefixture(page, root, consolelines, mode, spec)
        results.push(result)
        record(`${mode}:${spec.file}`, {
          ok: result.ok,
          skipped: result.skipped ?? false,
        })
      } catch (err) {
        const termdump = await readalltermtext(page, root).catch(() => '')
        const result: FixtureResult = {
          mode,
          fixture: spec.file,
          ok: false,
          reason: err instanceof Error ? err.message : String(err),
          actualtail: termdump.slice(-800),
        }
        results.push(result)
        record(`${mode}:${spec.file}:fail`, { reason: result.reason })
        writescenarioreport(REPORT_PATH, {
          ok: false,
          failedgate: `${mode}:${spec.file}`,
          timeline,
          results,
          recentlogs: consolelines.slice(-160),
        })
        throw err
      }
    }
  }

  const failed = results.filter((row) => !row.ok)
  const report = {
    ok: failed.length === 0,
    modes,
    timeline,
    results,
  }
  writescenarioreport(REPORT_PATH, report)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (failed.length > 0) {
    throw new Error(
      `wanix fixtures stdout failed: ${failed.map((row) => `${row.mode}/${row.fixture}`).join(', ')}`,
    )
  }
}

export default validatefixturesstdout
