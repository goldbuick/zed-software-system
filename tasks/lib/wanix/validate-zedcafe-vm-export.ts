import { readFileSync } from 'node:fs'
import path from 'node:path'

import { WANIX_PUBLIC_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import {
  WANIX_ZEDCAFE_VM_SESSION,
  callwanixrpcinpage,
  callwanixtermwriteinpage,
  collectexportconsoleerrors,
  collectexporttrace,
  failzedcafegate,
  importfixturebookinpage,
  parsebookcountfromterm,
  pollfindplayersoutput,
  polluntil,
  readhostexportpaths,
  readhostexportstats,
  readlslistsbooksdir,
  readmembookcountinpage,
  readplaywrightlogs,
  readtermbuffertext,
  sendwanixcli,
  waitwanixrpcping,
  writededcafefailurereport,
  type ZedcafeStatsSnapshot,
  type ZedcafeTimelineEntry,
} from 'tasks/lib/wanix/playwrightzedcafe'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import { WANIX_ZEDCAFE_EXPORT_READY_POLL_MS } from 'zss/feature/wanix/wanixzedcafeconstants'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const EXPORT_POLL_MS = WANIX_ZEDCAFE_EXPORT_READY_POLL_MS
const EXPORT_BUDGET_MS = 90_000
const FIXTURE_BOOK_PATH = path.join(
  process.cwd(),
  'ops/fixtures/books/example-coolregionsbow.book.json',
)
const USE_FIXTURE_BOOK = process.env.ZEDCAFE_VALIDATE_FIXTURE === '1'

async function dropwanixwasm(
  page: import('@playwright/test').Page,
  root: string,
  fixturepath: string,
  filename: string,
) {
  const bytes = readFileSync(fixturepath)
  await page.evaluate(
    async ({ projectroot, filebytes, label }) => {
      const { emitwanixdropfile } = await import(
        `/@fs${projectroot}/zss/feature/wanix/wanixdropparse.ts`
      )
      const { register, registerreadplayer } = await import(
        `/@fs${projectroot}/zss/device/register.ts`
      )
      const file = new File([new Uint8Array(filebytes)], label, {
        type: 'application/wasm',
      })
      emitwanixdropfile(register, registerreadplayer(), file)
    },
    { projectroot: root, filebytes: Array.from(bytes), label: filename },
  )
}

const TERM_DUMP_TAIL_LINES = 40

function buildfailcontext(
  timeline: ZedcafeTimelineEntry[],
  taskrid: string | null,
  rpc: Record<string, unknown>,
  consolelines: string[],
  pagelogs: string[],
  termdump: string,
  hoststats: ZedcafeStatsSnapshot | null,
  gueststats: ZedcafeStatsSnapshot | null,
  hostexportpaths: string[],
  membookcount: number,
) {
  const { readdirerrors, walkbookserrors } =
    collectexportconsoleerrors(consolelines)
  const termlines = termdump.length ? termdump.split('\n') : []
  const termdumptail =
    termlines.length > TERM_DUMP_TAIL_LINES
      ? termlines.slice(-TERM_DUMP_TAIL_LINES).join('\n')
      : termdump
  return {
    timeline,
    taskrid,
    rpc,
    readdirerrors,
    walkbookserrors,
    termdump,
    termdumptail,
    recentlogs: pagelogs.slice(-80),
    hoststats,
    gueststats,
    hostexportpaths,
    membookcount,
    exporttrace: collectexporttrace(consolelines),
  }
}

const validatezedcafevmexport: HeadedPlaywrightScript = async ({
  page,
  baseurl,
  root,
}) => {
  const start = Date.now()
  const timeline: ZedcafeTimelineEntry[] = []
  const consolelines: string[] = []
  const pagelogs: string[] = []
  let taskrid: string | null = null
  let hoststats: ZedcafeStatsSnapshot | null = null
  let gueststats: ZedcafeStatsSnapshot | null = null
  let hostexportpaths: string[] = []
  let membookcount = 0
  let termdump = ''

  const record = (label: string, extra?: Record<string, unknown>) => {
    timeline.push({ ms: Date.now() - start, label, extra })
  }

  const fail = (gate: string, rpc: Record<string, unknown> = {}): never => {
    return failzedcafegate(
      gate,
      buildfailcontext(
        timeline,
        taskrid,
        rpc,
        consolelines,
        pagelogs,
        termdump,
        hoststats,
        gueststats,
        hostexportpaths,
        membookcount,
      ),
      root,
    )
  }

  const failpoll = (gate: string, err: unknown, rpc: Record<string, unknown> = {}): never => {
    return fail(gate, {
      ...rpc,
      pollerror: err instanceof Error ? err.message : String(err),
    })
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

  let wanixbooted = false
  page.on('pageerror', (err) => {
    consolelines.push(`[pageerror] ${err.message}`)
  })
  page.on('console', (msg) => {
    const line = `[${msg.type()}] ${msg.text()}`
    consolelines.push(line)
    pagelogs.push(line)
    if (msg.text().includes('[wanix] idle') || msg.text().includes('[wanix] ready')) {
      wanixbooted = true
    }
  })

  await page.goto(baseurl, {
    waitUntil: 'load',
    timeout: VALIDATE_TIMEOUT_MS,
  })
  record('page-loaded')

  await withscripttimeout('wanix-boot', VALIDATE_TIMEOUT_MS, async () => {
    while (!wanixbooted) {
      const rpcready = await page
        .evaluate(
          () =>
            typeof (globalThis as { callwanixrpc?: unknown }).callwanixrpc ===
            'function',
        )
        .catch(() => false)
      if (rpcready) {
        wanixbooted = true
        break
      }
      await page.waitForTimeout(EXPORT_POLL_MS)
    }
  })
  record('wanix-boot')

  await waitforregistersession(page, root)
  record('register-session')

  await waitwanixrpcping(page, VALIDATE_TIMEOUT_MS)
  record('wanix-rpc-ping')

  if (USE_FIXTURE_BOOK) {
    const bookjson = readFileSync(FIXTURE_BOOK_PATH, 'utf8')
    membookcount = await importfixturebookinpage(page, root, bookjson)
    record('fixture-book-loaded', { membookcount, mode: 'fixture' })
    if (membookcount < 1) {
      fail('fixture-book-loaded', { membookcount })
    }
  } else {
    const booksloaded = await polluntil(
      'login-books-loaded',
      EXPORT_BUDGET_MS,
      EXPORT_POLL_MS,
      async () => {
        const bookcount = await readmembookcountinpage(page, root)
        return { ready: bookcount >= 1, bookcount }
      },
      (snap) => snap.ready === true,
    )
    membookcount = booksloaded.bookcount
    record('login-books-loaded', { membookcount, mode: 'login' })
    if (membookcount < 1) {
      fail('login-books-loaded', {
        membookcount,
        hint: 'storage has no books in sim memory — import content or run with ZEDCAFE_VALIDATE_FIXTURE=1',
      })
    }
  }

  await sendwanixcli(page, root, '#wanix vm')

  const vmstatus = await polluntil(
    'wanix-vm-started',
    VALIDATE_TIMEOUT_MS,
    EXPORT_POLL_MS,
    async () =>
      callwanixrpcinpage<{
        running?: boolean
        vrid?: string | null
      }>(page, 'readvmstatus', [], 10_000),
    (status) => !!status?.vrid,
  )
  record('wanix-vm-started', vmstatus)

  if (!vmstatus?.vrid) {
    const logs = await readplaywrightlogs(page)
    fail('wanix-vm-started', { vmstatus, logs })
  }

  const exportlive = await polluntil(
    'host-export-books',
    EXPORT_BUDGET_MS,
    EXPORT_POLL_MS,
    async () => {
      taskrid = await callwanixrpcinpage<string | null>(
        page,
        'readzedcafetaskrid',
        [],
        10_000,
      )
      if (!taskrid) {
        return {
          taskrid: null as string | null,
          live: false,
          hoststats: null as ZedcafeStatsSnapshot | null,
          hasbooks: false,
        }
      }
      const live = await callwanixrpcinpage<boolean>(
        page,
        'iszedcafeexportlive',
        [taskrid],
        10_000,
      )
      hoststats = await readhostexportstats(page, taskrid)
      const booksdir = await callwanixrpcinpage<string[]>(
        page,
        'listdir',
        [`#task/${taskrid}/export/books`],
        10_000,
      ).catch(() => [])
      const hasbooks =
        Array.isArray(booksdir) &&
        booksdir.length > 0 &&
        (hoststats?.bookCount ?? 0) >= 1
      return { taskrid, live: !!live, hoststats, hasbooks }
    },
    (snap) => snap.live === true && snap.hasbooks === true && !!snap.taskrid,
  )
  record('host-export-books', exportlive)

  taskrid = exportlive.taskrid
  hoststats = exportlive.hoststats
  hostexportpaths = await readhostexportpaths(page)
  if (!taskrid || !exportlive.hasbooks || (hoststats?.bookCount ?? 0) < 1) {
    fail('host-export-books', { exportlive, hostexportpaths })
  }

  record('task-export-live', { taskrid, hoststats })

  const postliveconsolestart = consolelines.length

  const exportdir = await callwanixrpcinpage<string[]>(
    page,
    'listdir',
    [`#task/${taskrid}/export`],
    10_000,
  ).catch((err: Error) => ({ error: err.message }))
  const readdirprobe = collectexportconsoleerrors(
    consolelines.slice(postliveconsolestart),
  )
  if (readdirprobe.readdirerrors.length > 0) {
    fail('export-readdir', { exportdir, ...readdirprobe })
  }
  if (
    !Array.isArray(exportdir) ||
    !exportdir.some((entry) => entry.replace(/\/$/, '') === 'stats.json')
  ) {
    fail('export-stats', { exportdir })
  }
  record('task-export-stats', { exportdir })

  const guestboundlive = await polluntil(
    'vm-guest-bound',
    EXPORT_BUDGET_MS,
    EXPORT_POLL_MS,
    async () => {
      const rid = await callwanixrpcinpage<string | null>(
        page,
        'readzedcafetaskrid',
        [],
        10_000,
      )
      if (!rid) {
        return { guestbound: false, rid: null as string | null }
      }
      const live = await callwanixrpcinpage<boolean>(
        page,
        'iszedcafeguestbound',
        [],
        10_000,
      )
      return { guestbound: !!live, rid }
    },
    (snap) => snap.guestbound === true,
  )
  record('vm-guest-bound', { ...guestboundlive, vmstatus, hoststats })

  if (!guestboundlive.guestbound) {
    fail('guestbound', { ...guestboundlive, vmstatus, hoststats })
  }

  await sendwanixcli(page, root, `#wanix attach ${WANIX_ZEDCAFE_VM_SESSION}`)
  await page.waitForTimeout(500)
  record('vm-attached')

  await polluntil(
    'vm-shell-prompt',
    EXPORT_BUDGET_MS,
    EXPORT_POLL_MS,
    async () => readtermbuffertext(page, root, WANIX_ZEDCAFE_VM_SESSION),
    (text) => /~\s*#|#\s/.test(text),
  )

  await callwanixtermwriteinpage(
    page,
    root,
    'zedcafe-ready\n',
    WANIX_ZEDCAFE_VM_SESSION,
  )

  const readytext = await polluntil(
    'vm-term-zedcafe-ready',
    EXPORT_BUDGET_MS,
    EXPORT_POLL_MS,
    async () => {
      termdump = await readtermbuffertext(page, root, WANIX_ZEDCAFE_VM_SESSION)
      return termdump
    },
    (text) => /ready:\s*\/zedcafe/.test(text),
  )
  record('vm-term-zedcafe-ready')

  if (!/ready:\s*\/zedcafe/.test(readytext)) {
    fail('vm-term-zedcafe-ready', { readytext: readytext.slice(-500) })
  }

  await callwanixtermwriteinpage(
    page,
    root,
    'zedcafe-stats\n',
    WANIX_ZEDCAFE_VM_SESSION,
  )

  const statstext = await polluntil(
    'vm-term-zedcafe-stats',
    EXPORT_BUDGET_MS,
    EXPORT_POLL_MS,
    async () => {
      termdump = await readtermbuffertext(page, root, WANIX_ZEDCAFE_VM_SESSION)
      return termdump
    },
    (text) => /"bookCount"\s*:\s*\d+/.test(text),
  )
  record('vm-term-zedcafe-stats')

  const guestbookcount = parsebookcountfromterm(statstext)
  gueststats =
    guestbookcount !== null && hoststats
      ? {
          bookCount: guestbookcount,
          exportedAt: hoststats.exportedAt,
          bytes: hoststats.bytes,
        }
      : null

  if (guestbookcount === null || guestbookcount < 1) {
    fail('vm-stats-bookcount', {
      guestbookcount,
      hoststats,
      statstext: statstext.slice(-800),
    })
  }
  if (hoststats && guestbookcount !== hoststats.bookCount) {
    fail('host-guest-parity', { guestbookcount, hoststats })
  }

  await callwanixtermwriteinpage(
    page,
    root,
    'ls -la /zedcafe\n',
    WANIX_ZEDCAFE_VM_SESSION,
  )

  try {
    termdump = await polluntil(
      'vm-term-ls-zedcafe',
      EXPORT_BUDGET_MS,
      EXPORT_POLL_MS,
      async () => readtermbuffertext(page, root, WANIX_ZEDCAFE_VM_SESSION),
      (text) => /stats\.json/.test(text) && readlslistsbooksdir(text),
    )
  } catch (err) {
    termdump = await readtermbuffertext(page, root, WANIX_ZEDCAFE_VM_SESSION)
    failpoll('vm-term-ls-zedcafe', err, { termdump: termdump.slice(-1200) })
  }
  record('vm-term-ls-zedcafe')

  if (!/stats\.json/.test(termdump) || !readlslistsbooksdir(termdump)) {
    fail('vm-term-ls-zedcafe', {
      statstext: statstext.slice(-500),
      termdump: termdump.slice(-800),
    })
  }

  const fixturepath = path.join(WANIX_PUBLIC_FIXTURES_DIR, 'findplayers.wasm')
  await dropwanixwasm(page, root, fixturepath, 'findplayers.wasm')
  record('findplayers-drop')

  const findplayerstext = await pollfindplayersoutput(
    page,
    root,
    consolelines,
    VALIDATE_TIMEOUT_MS,
    EXPORT_POLL_MS,
  )
  record('findplayers-run', { sample: findplayerstext.slice(-400) })

  if (!findplayerstext || !/\["books\/[^"]+"/.test(findplayerstext.replace(/\s+/g, ''))) {
    fail('findplayers-run', {
      findplayerstext: findplayerstext.slice(-800),
      membookcount,
      hostexportpaths: hostexportpaths.slice(0, 10),
    })
  }

  const walkprobe = collectexportconsoleerrors(consolelines)
  if (walkprobe.walkbookserrors.length > 0) {
    fail('findplayers-walk', { walkprobe })
  }

  record('pass', {
    hoststats,
    gueststats,
    membookcount,
    exporttrace: collectexporttrace(consolelines).slice(-20),
  })
  writededcafefailurereport(
    {
      failedgate: 'pass',
      timeline,
      taskrid,
      rpc: { ok: true },
      readdirerrors: [],
      walkbookserrors: [],
      termdump: termdump.slice(-500),
      recentlogs: pagelogs.slice(-20),
      hoststats,
      gueststats,
      hostexportpaths,
      membookcount,
      exporttrace: collectexporttrace(consolelines).slice(-20),
    },
    root,
  )
}

export default validatezedcafevmexport
