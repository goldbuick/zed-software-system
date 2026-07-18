import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import {
  attachconsolecapture,
  dropwanixbundle,
  hardstopwanixroominpage,
  installplaywrightlogcapture,
  publicwanixfixture,
  readroommountkey,
  waitforlogsubstring,
  writescenarioreport,
} from 'tasks/lib/wanix/playwrighthelpers'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import {
  type ZedcafeTimelineEntry,
  polliswanixready,
  sendwanixcli,
} from 'tasks/lib/wanix/playwrightzedcafe'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const REPORT_PATH = '/tmp/wanix-warm-reuse-report.json'
const BUNDLE = publicwanixfixture('bundle-one.tgz')

async function ensuretaskroominpage(
  page: import('@playwright/test').Page,
  root: string,
): Promise<void> {
  await page.evaluate(async (projectroot) => {
    const { ensurewanixtaskroom } = await import(
      `/@fs${projectroot}/zss/device/wanixclient/wanixroom.ts`
    )
    const { SOFTWARE } = await import(
      `/@fs${projectroot}/zss/device/session.ts`
    )
    const { registerreadplayer } = await import(
      `/@fs${projectroot}/zss/device/registerplayer.ts`
    )
    ensurewanixtaskroom(SOFTWARE, registerreadplayer())
  }, root)
}

const validatewarmreuse: HeadedPlaywrightScript = async ({
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
    throw new Error(`wanix warm-reuse validator failed at gate: ${gate}`)
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

  await dropwanixbundle(page, root, BUNDLE, 'bundle-one.tgz')
  record('first-drop')
  await waitforlogsubstring(
    page,
    consolelines,
    'drop-spawn',
    VALIDATE_TIMEOUT_MS,
    'first-run',
  )
  record('first-run')
  // ensuretaskroomfordrop emits applyroom; wait until parent config matches.
  await withscripttimeout('parent-task-room', VALIDATE_TIMEOUT_MS, async () => {
    for (;;) {
      const mode = await page.evaluate(async (projectroot) => {
        const { readwanixroomconfig } = await import(
          `/@fs${projectroot}/zss/device/wanixclient/wanixroom.ts`
        )
        return readwanixroomconfig().mode
      }, root)
      if (mode === 'task') {
        return
      }
      await page.waitForTimeout(50)
    }
  })
  record('parent-task-room')
  const mountkey1 = await readroommountkey(page, root)
  record('mountkey-after-first', { mountkey1 })

  // Warm reuse: re-apply on an already-active task room (same mountkey).
  await ensuretaskroominpage(page, root)
  record('ensure-task-room')
  await waitforlogsubstring(
    page,
    consolelines,
    'applyroom-warm-reuse',
    VALIDATE_TIMEOUT_MS,
    'warm-reuse',
  )
  record('warm-reuse-seen')
  const mountkeywarm = await readroommountkey(page, root)
  if (mountkeywarm !== mountkey1) {
    fail('warm-mountkey-stable', { mountkey1, mountkeywarm })
  }

  await sendwanixcli(page, root, '#wanix stop')
  record('soft-stop')
  await waitforlogsubstring(
    page,
    consolelines,
    'applyroom-soft-idle',
    VALIDATE_TIMEOUT_MS,
    'soft-idle',
  )
  record('soft-idle-seen')
  const mountkeysoft = await readroommountkey(page, root)
  if (mountkeysoft !== mountkey1) {
    fail('soft-mountkey-stable', { mountkey1, mountkeysoft })
  }

  await hardstopwanixroominpage(page, root)
  record('hard-stop')
  await waitforlogsubstring(
    page,
    consolelines,
    'applyroom-remount',
    VALIDATE_TIMEOUT_MS,
    'hard-remount',
  ).catch(() => '')
  const mountkeyhard = await readroommountkey(page, root)
  record('mountkey-after-hard', { mountkeyhard })
  if (!(mountkeyhard > mountkeysoft)) {
    fail('hard-mountkey-bumped', { mountkeysoft, mountkeyhard })
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mountkey1,
        mountkeywarm,
        mountkeysoft,
        mountkeyhard,
        timeline,
        reportpath: REPORT_PATH,
      },
      null,
      2,
    ),
  )
  writescenarioreport(REPORT_PATH, {
    ok: true,
    mountkey1,
    mountkeywarm,
    mountkeysoft,
    mountkeyhard,
    timeline,
  })
}

export default validatewarmreuse
