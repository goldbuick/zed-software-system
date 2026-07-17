import { readFileSync } from 'node:fs'
import path from 'node:path'

import { WANIX_PUBLIC_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import {
  type ZedcafeTimelineEntry,
  failzedcafegate,
  importfixturebookinpage,
  polliswanixready,
  polluntil,
  readmembookcountinpage,
  readplaywrightlogs,
  readtermbuffertext,
  readwanixtermbufferkeysinpage,
} from 'tasks/lib/wanix/playwrightzedcafe'
import { WANIX_ZEDCAFE_EXPORT_READY_POLL_MS } from 'zss/feature/wanix/wanixzedcafeconstants'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const EXPORT_POLL_MS = WANIX_ZEDCAFE_EXPORT_READY_POLL_MS
const GREENRING_WASM = path.join(WANIX_PUBLIC_FIXTURES_DIR, 'greenring.wasm')
const FIXTURE_BOOK_PATH = path.join(
  process.cwd(),
  'ops/fixtures/books/example-coolregionsbow.book.json',
)
const USE_FIXTURE_BOOK = process.env.ZEDCAFE_VALIDATE_FIXTURE === '1'
const PAINTED_RE = /\{"painted":\d+\}/
const IMPORT_SYNCED_RE = /zedcafe import: synced/
const GUEST_DIFF_RE = /poll-guest-diff=true/
const KICK_SKIP_INACTIVE_RE = /poll-kick-skip active=false/

async function dropwanixwasm(
  page: import('@playwright/test').Page,
  root: string,
  fixturepath: string,
  filename: string,
) {
  const bytes = readFileSync(fixturepath)
  await page.evaluate(
    async ({ projectroot, filebytes, label }) => {
      const { wanixserverdrop } = await import(
        `/@fs${projectroot}/zss/device/api.ts`
      )
      const { SOFTWARE } = await import(
        `/@fs${projectroot}/zss/device/session.ts`
      )
      const { registerreadplayer } = await import(
        `/@fs${projectroot}/zss/device/registerplayer.ts`
      )
      wanixserverdrop(
        SOFTWARE,
        registerreadplayer(),
        label,
        'wasm',
        new Uint8Array(filebytes),
      )
    },
    { projectroot: root, filebytes: Array.from(bytes), label: filename },
  )
}

async function readexportsyncdebug(
  page: import('@playwright/test').Page,
  root: string,
): Promise<Record<string, unknown>> {
  return page.evaluate(async (projectroot) => {
    const state = await import(
      `/@fs${projectroot}/zss/device/wanixclient/state.ts`
    )
    const room = await import(
      `/@fs${projectroot}/zss/device/wanixclient/wanixroom.ts`
    )
    const pending = state.readpendingsync()
    return {
      pollactive: state.readzedcafepollactive(),
      mode: room.readwanixroomconfig().mode,
      pendingphase: pending?.phase ?? null,
      pendingmemcount: pending?.memcount ?? null,
      pendingtaskrid: pending?.taskrid ?? null,
      lasthostpushpaths: Object.keys(state.readlasthostpushdoc()).length,
    }
  }, root)
}

async function readalltermtext(
  page: import('@playwright/test').Page,
  root: string,
): Promise<string> {
  const keys = await readwanixtermbufferkeysinpage(page, root)
  const chunks: string[] = []
  for (const key of keys) {
    const text = await readtermbuffertext(page, root, key)
    if (text) {
      chunks.push(`--- ${key} ---\n${text}`)
    }
  }
  return chunks.join('\n')
}

const validategreenringdrop: HeadedPlaywrightScript = async ({
  page,
  baseurl,
  root,
}) => {
  const start = Date.now()
  const timeline: ZedcafeTimelineEntry[] = []
  const consolelines: string[] = []
  let membookcount = 0

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

  const record = (label: string, extra?: Record<string, unknown>) => {
    timeline.push({ ms: Date.now() - start, label, extra })
  }

  const fail = async (
    gate: string,
    rpc: Record<string, unknown> = {},
  ): Promise<never> => {
    const termdump = await readalltermtext(page, root).catch(() => '')
    const tapelogs = await readplaywrightlogs(page).catch(() => [])
    return failzedcafegate(
      gate,
      {
        failedgate: gate,
        timeline,
        taskrid: null,
        rpc,
        readdirerrors: [],
        walkbookserrors: [],
        termdump,
        termdumptail: termdump.slice(-1500),
        recentlogs: [...consolelines, ...tapelogs].slice(-160),
        exporttrace: consolelines.filter((line) =>
          line.includes('[zedcafe-export]'),
        ),
        membookcount,
      },
      root,
    )
  }

  page.on('console', (msg) => {
    consolelines.push(`[${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', (err) => {
    consolelines.push(`[pageerror] ${err.message}`)
  })

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
      90_000,
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
    await fail('books-loaded', {
      membookcount,
      hint: 'pass book URL hash or ZEDCAFE_VALIDATE_FIXTURE=1',
    })
  }

  // Mirror manual UX: drop only. Do not pre-arm poll — drop-pull must arm it.
  await dropwanixwasm(page, root, GREENRING_WASM, 'greenring.wasm')
  record('greenring-drop')

  let outcome: {
    ready: boolean
    painted: boolean
    kickskipinactive: boolean
    guestdiff: boolean
    imported: boolean
    pollarmpull: boolean
  }
  try {
    outcome = await withscripttimeout(
      'greenring-import',
      VALIDATE_TIMEOUT_MS,
      async () =>
        polluntil(
          'greenring-import',
          VALIDATE_TIMEOUT_MS,
          EXPORT_POLL_MS,
          async () => {
            const tapelogs = await readplaywrightlogs(page)
            const termdump = await readalltermtext(page, root)
            const joined = [...consolelines, ...tapelogs, termdump].join('\n')
            const painted = PAINTED_RE.test(joined)
            const kickskipinactive = consolelines.some((line) =>
              line.includes('poll-kick-skip active=false'),
            )
            const guestdiff = consolelines.some((line) =>
              line.includes('poll-guest-diff=true'),
            )
            const imported = [...consolelines, ...tapelogs].some((line) =>
              line.includes('zedcafe import: synced'),
            )
            const pollarmpull = consolelines.some((line) =>
              line.includes('poll-arm host-pull'),
            )
            return {
              ready: painted && guestdiff && imported && !kickskipinactive,
              painted,
              kickskipinactive,
              guestdiff,
              imported,
              pollarmpull,
            }
          },
          (snap) => snap.ready === true,
        ),
    )
  } catch (err) {
    const syncdebug = await readexportsyncdebug(page, root).catch(() => ({}))
    await fail('greenring-import-timeout', {
      error: err instanceof Error ? err.message : String(err),
      syncdebug,
    })
  }

  record('greenring-import', outcome)

  if (outcome.kickskipinactive) {
    await fail('poll-armed-after-drop', {
      outcome,
      hint: 'file-change kick skipped because poll inactive',
    })
  }
  if (!outcome.painted) {
    await fail('greenring-painted', { outcome })
  }
  if (!outcome.guestdiff || !outcome.imported) {
    await fail('greenring-import', {
      outcome,
      hint: 'expected poll-guest-diff=true and zedcafe import: synced',
    })
  }

  process.stdout.write(
    JSON.stringify({ ok: true, timeline, outcome }, null, 2) + '\n',
  )
}

export default validategreenringdrop
