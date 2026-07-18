import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import { WANIX_ZEDSYNC_PEER_DIR } from 'ops/lib/fixturepaths'
import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import {
  attachconsolecapture,
  installplaywrightlogcapture,
  waitforlogsubstring,
  waitfortermorsubstring,
  writescenarioreport,
} from 'tasks/lib/wanix/playwrighthelpers'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import {
  type ZedcafeTimelineEntry,
  collectwanixperf,
  importfixturebookinpage,
  polliswanixready,
  polluntil,
  readmembookcountinpage,
  readplaywrightlogs,
  sendwanixcli,
} from 'tasks/lib/wanix/playwrightzedcafe'
import { WANIX_ZEDCAFE_EXPORT_READY_POLL_MS } from 'zss/feature/wanix/wanixzedcafeconstants'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const REPORT_PATH = '/tmp/wanix-zedsync-remote-report.json'
const DEFAULT_WSS = 'wss://localhost:8765/'
const REMOTE_DST = 'remote'
const DEFAULT_PEER_ROOT = WANIX_ZEDSYNC_PEER_DIR
const FIXTURE_BOOK_PATH = path.join(
  process.cwd(),
  'ops/fixtures/books/example-coolregionsbow.book.json',
)

type Report = {
  failedgate: string
  wssurl: string
  peerroot: string
  timeline: ZedcafeTimelineEntry[]
  perf: ZedcafeTimelineEntry[]
  recentlogs: string[]
  extra?: Record<string, unknown>
}

function writereport(report: Report): void {
  writescenarioreport(REPORT_PATH, report)
}

function collectapplyerrors(lines: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (
      /wanix room apply failed/i.test(line) ||
      /wanix remote mount timeout/i.test(line) ||
      /zedsync: timed out/i.test(line) ||
      /zedsync: targetpath must not/i.test(line)
    ) {
      out.push(line)
    }
  }
  return out
}

async function readdirremote(
  page: import('@playwright/test').Page,
  dst: string,
): Promise<string[]> {
  const frame = page.frames().find((f) => f.url().includes('wanix.html'))
  if (!frame) {
    throw new Error('wanix iframe frame not found')
  }
  return frame.evaluate(async (mountdst) => {
    const sys = document.querySelector('wanix-namespace') as
      | (HTMLElement & {
          root?: { readDir: (path: string) => Promise<unknown> }
        })
      | null
    if (!sys?.root?.readDir) {
      throw new Error('wanix-namespace.root.readDir missing')
    }
    const entries = await sys.root.readDir(mountdst)
    if (entries == null) {
      return []
    }
    if (Array.isArray(entries)) {
      return entries.map((entry) => String(entry))
    }
    if (typeof entries === 'object' && Symbol.iterator in entries) {
      return [...(entries as Iterable<unknown>)].map((entry) => String(entry))
    }
    throw new Error(`readDir(${mountdst}) unexpected type ${typeof entries}`)
  }, dst)
}

function listpeerfiles(rootdir: string, limit = 40): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    if (out.length >= limit) {
      return
    }
    let entries: string[] = []
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (let i = 0; i < entries.length; i++) {
      if (out.length >= limit) {
        return
      }
      const name = entries[i]
      if (name.startsWith('.')) {
        continue
      }
      const full = path.join(dir, name)
      let st
      try {
        st = statSync(full)
      } catch {
        continue
      }
      if (st.isDirectory()) {
        walk(full)
      } else {
        out.push(path.relative(rootdir, full))
      }
    }
  }
  walk(rootdir)
  return out
}

function finddeleterestoretarget(rootdir: string): string | null {
  const files = listpeerfiles(rootdir, 200)
  for (let i = 0; i < files.length; i++) {
    const rel = files[i]
    if (rel.endsWith('stats.json') && rel.includes('/')) {
      return path.join(rootdir, rel)
    }
  }
  for (let i = 0; i < files.length; i++) {
    if (files[i].endsWith('.json')) {
      return path.join(rootdir, files[i])
    }
  }
  return null
}

const validatezedsyncremote: HeadedPlaywrightScript = async ({
  page,
  baseurl,
  root,
}) => {
  const start = Date.now()
  const timeline: ZedcafeTimelineEntry[] = []
  const consolelines: string[] = []
  const wssurl = process.env.WANIX_P9_WSS_URL?.trim() || DEFAULT_WSS
  const peerroot = process.env.WANIX_P9_SERVE_ROOT?.trim() || DEFAULT_PEER_ROOT
  const usefixture = process.env.ZEDCAFE_VALIDATE_FIXTURE === '1'

  const record = (label: string, extra?: Record<string, unknown>) => {
    timeline.push({ ms: Date.now() - start, label, extra })
  }

  const fail = (gate: string, extra: Record<string, unknown> = {}): never => {
    writereport({
      failedgate: gate,
      wssurl,
      peerroot,
      timeline,
      perf: collectwanixperf(consolelines, start),
      recentlogs: consolelines.slice(-160),
      extra: {
        ...extra,
        applyerrors: collectapplyerrors(consolelines),
        peerfiles: existsSync(peerroot) ? listpeerfiles(peerroot) : [],
      },
    })
    throw new Error(`wanix zedsync remote validator failed at gate: ${gate}`)
  }

  await installplaywrightlogcapture(page)
  attachconsolecapture(page, consolelines, timeline, start)

  try {
    await withscripttimeout('page-load', VALIDATE_TIMEOUT_MS, async () => {
      await page.goto(baseurl, {
        waitUntil: 'load',
        timeout: VALIDATE_TIMEOUT_MS,
      })
    })
    record('page-load')

    await waitforregistersession(page, root)
    record('register-session')
    await polliswanixready(page, VALIDATE_TIMEOUT_MS)
    record('wanix-ready')

    if (usefixture) {
      const bookjson = readFileSync(FIXTURE_BOOK_PATH, 'utf8')
      const count = await importfixturebookinpage(page, root, bookjson)
      record('fixture-book', { count })
      if (count < 1) {
        fail('fixture-book')
      }
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
      record('login-books', books)
      if (!books.ready) {
        fail('login-books', {
          hint: 'pass book URL hash or ZEDCAFE_VALIDATE_FIXTURE=1',
        })
      }
    }

    const connectcmd = `#wanix remote connect ${wssurl} ${REMOTE_DST}`
    await sendwanixcli(page, root, connectcmd)
    record('remote-connect-sent', { cmd: connectcmd })

    await withscripttimeout('readdir-remote', VALIDATE_TIMEOUT_MS, async () => {
      for (;;) {
        try {
          await readdirremote(page, REMOTE_DST)
          return
        } catch {
          const early = collectapplyerrors(consolelines)
          if (early.length > 0) {
            fail('remote-connect', { applyerrors: early })
          }
          await page.waitForTimeout(WANIX_ZEDCAFE_EXPORT_READY_POLL_MS)
        }
      }
    })
    record('readdir-remote-ok')

    await sendwanixcli(page, root, `#wanix zedsync ${REMOTE_DST}`)
    record('zedsync-sent')

    await waitforlogsubstring(
      page,
      consolelines,
      /zedsync: (seed ready|watching)/,
      VALIDATE_TIMEOUT_MS,
      'zedsync-ready',
    )
    record('zedsync-ready')

    const peerfiles = await polluntil(
      'peer-seeded',
      VALIDATE_TIMEOUT_MS,
      WANIX_ZEDCAFE_EXPORT_READY_POLL_MS,
      async () => listpeerfiles(peerroot),
      (files) => files.length > 0,
    )
    record('peer-seeded', {
      count: peerfiles.length,
      sample: peerfiles.slice(0, 8),
    })
    if (peerfiles.length < 1) {
      fail('peer-seeded', { peerroot })
    }

    const target = finddeleterestoretarget(peerroot)
    if (!target) {
      fail('delete-restore-target', { peerfiles })
    }
    const rel = path.relative(peerroot, target)
    rmSync(target)
    record('peer-deleted', { rel })

    await polluntil(
      'peer-restored',
      VALIDATE_TIMEOUT_MS,
      WANIX_ZEDCAFE_EXPORT_READY_POLL_MS,
      async () => existsSync(target),
      (ok) => ok === true,
    )
    if (!existsSync(target)) {
      fail('peer-restored', { rel })
    }
    record('peer-restored', { rel })

    await sendwanixcli(page, root, '#wanix stop')
    record('soft-stop-sent')
    await waitfortermorsubstring(
      page,
      root,
      consolelines,
      /zedsync: stopped/,
      VALIDATE_TIMEOUT_MS,
      'zedsync-stopped',
    )
    record('zedsync-stopped')

    const nativelogs = await readplaywrightlogs(page)
    for (let i = 0; i < nativelogs.length; i++) {
      consolelines.push(`[nativelog] ${nativelogs[i]}`)
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          wssurl,
          peerroot,
          peerfilecount: listpeerfiles(peerroot).length,
          restored: rel,
          timeline,
          reportpath: REPORT_PATH,
        },
        null,
        2,
      ),
    )
    writeFileSync(
      REPORT_PATH,
      `${JSON.stringify(
        {
          ok: true,
          wssurl,
          peerroot,
          timeline,
          perf: collectwanixperf(consolelines, start),
        },
        null,
        2,
      )}\n`,
    )
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes('wanix zedsync remote validator failed at gate:')
    ) {
      throw err
    }
    writereport({
      failedgate: 'uncaught',
      wssurl,
      peerroot,
      timeline,
      perf: collectwanixperf(consolelines, start),
      recentlogs: consolelines.slice(-160),
      extra: {
        error: err instanceof Error ? err.message : String(err),
      },
    })
    throw err
  }
}

export default validatezedsyncremote
