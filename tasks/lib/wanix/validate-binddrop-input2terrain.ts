import { readFileSync } from 'node:fs'
import path from 'node:path'

import { PLAYWRIGHT_SCENARIO_TIMEOUT_MS } from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import {
  attachconsolecapture,
  binddroptostampedsession,
  dropwanixwasm,
  installplaywrightlogcapture,
  listwanixtaskids,
  publicwanixfixture,
  waitfornewwanixtaskid,
  waitfortermorsubstring,
  writescenarioreport,
} from 'tasks/lib/wanix/playwrighthelpers'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import {
  type ZedcafeTimelineEntry,
  importfixturebookinpage,
  polliswanixready,
  polluntil,
  readmembookcountinpage,
} from 'tasks/lib/wanix/playwrightzedcafe'
import { WANIX_ZEDCAFE_EXPORT_READY_POLL_MS } from 'zss/feature/wanix/wanixzedcafeconstants'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const REPORT_PATH = '/tmp/wanix-binddrop-input2terrain-report.json'
const STAMP = 'stamp-red.png'
const INPUT2TERRAIN = publicwanixfixture('input2terrain.wasm')
const FIXTURE_BOOK_PATH = path.join(
  process.cwd(),
  'ops/fixtures/books/example-coolregionsbow.book.json',
)
const USE_FIXTURE = process.env.ZEDCAFE_VALIDATE_FIXTURE === '1'
const WROTE_RE = /input2terrain: wrote/
const IMPORT_RE = /zedcafe import: synced/

const validateinput2terrain: HeadedPlaywrightScript = async ({
  page,
  baseurl,
  root,
}) => {
  const start = Date.now()
  const timeline: ZedcafeTimelineEntry[] = []
  const consolelines: string[] = []

  const record = (label: string, extra?: Record<string, unknown>) => {
    timeline.push({ ms: Date.now() - start, label, extra })
  }

  const fail = (gate: string, extra: Record<string, unknown> = {}): never => {
    writescenarioreport(REPORT_PATH, {
      failedgate: gate,
      timeline,
      recentlogs: consolelines.slice(-160),
      extra,
    })
    throw new Error(`wanix input2terrain validator failed at gate: ${gate}`)
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

  let membookcount = 0
  if (USE_FIXTURE) {
    membookcount = await importfixturebookinpage(
      page,
      root,
      readFileSync(FIXTURE_BOOK_PATH, 'utf8'),
    )
  } else {
    const books = await polluntil(
      'login-books',
      90_000,
      WANIX_ZEDCAFE_EXPORT_READY_POLL_MS,
      async () => {
        const bookcount = await readmembookcountinpage(page, root)
        return { ready: bookcount >= 1, bookcount }
      },
      (snap) => snap.ready,
    )
    membookcount = books.bookcount
  }
  record('books-loaded', { membookcount })
  if (membookcount < 1) {
    fail('books-loaded', {
      hint: 'pass book URL hash or ZEDCAFE_VALIDATE_FIXTURE=1',
    })
  }

  const known = new Set(await listwanixtaskids(page))
  // Race: bind stamp as soon as the task element exists so input/ is ready.
  const bindrace = (async () => {
    const taskid = await waitfornewwanixtaskid(page, known, VALIDATE_TIMEOUT_MS)
    record('task-seen', { taskid })
    await binddroptostampedsession(page, root, taskid, STAMP)
    record('stamp-bound', { taskid })
    return taskid
  })()

  await dropwanixwasm(page, root, INPUT2TERRAIN, 'input2terrain.wasm')
  record('input2terrain-dropped')
  const taskid = await bindrace
  record('bind-race-done', { taskid })

  const wrote = await waitfortermorsubstring(
    page,
    root,
    consolelines,
    WROTE_RE,
    VALIDATE_TIMEOUT_MS,
    'input2terrain-wrote',
  )
  if (!wrote) {
    fail('input2terrain-wrote', { taskid })
  }
  record('input2terrain-wrote')

  await waitfortermorsubstring(
    page,
    root,
    consolelines,
    IMPORT_RE,
    VALIDATE_TIMEOUT_MS,
    'import-synced',
  )
  record('import-synced')

  console.log(
    JSON.stringify(
      { ok: true, taskid, timeline, reportpath: REPORT_PATH },
      null,
      2,
    ),
  )
  writescenarioreport(REPORT_PATH, { ok: true, taskid, timeline })
}

export default validateinput2terrain
