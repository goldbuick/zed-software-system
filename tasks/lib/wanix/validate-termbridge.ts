import { PLAYWRIGHT_SCENARIO_TIMEOUT_MS } from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import {
  attachconsolecapture,
  dropwanixwasm,
  installplaywrightlogcapture,
  publicwanixfixture,
  waitforattachedsession,
  waitfortermorsubstring,
  writescenarioreport,
} from 'tasks/lib/wanix/playwrighthelpers'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import {
  type ZedcafeTimelineEntry,
  polliswanixready,
  writewaniixterminpage,
} from 'tasks/lib/wanix/playwrightzedcafe'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const REPORT_PATH = '/tmp/wanix-termbridge-report.json'
const TERMBRIDGE = publicwanixfixture('termbridge.wasm')

const validatetermbridge: HeadedPlaywrightScript = async ({
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
      recentlogs: consolelines.slice(-120),
      extra,
    })
    throw new Error(`wanix termbridge validator failed at gate: ${gate}`)
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

  await dropwanixwasm(page, root, TERMBRIDGE, 'termbridge.wasm')
  record('termbridge-dropped')

  const sessionkey = await waitforattachedsession(
    page,
    root,
    VALIDATE_TIMEOUT_MS,
  )
  record('attached', { sessionkey })

  await waitfortermorsubstring(
    page,
    root,
    consolelines,
    'wanix term bridge ready',
    VALIDATE_TIMEOUT_MS,
    'termbridge-banner',
  )
  record('banner-ok')

  await writewaniixterminpage(page, root, 'ping\n', sessionkey)
  record('ping-sent')

  const pong = await waitfortermorsubstring(
    page,
    root,
    consolelines,
    'pong',
    VALIDATE_TIMEOUT_MS,
    'termbridge-pong',
  )
  if (!pong) {
    fail('termbridge-pong', { sessionkey })
  }
  record('pong-ok')

  console.log(
    JSON.stringify(
      { ok: true, sessionkey, timeline, reportpath: REPORT_PATH },
      null,
      2,
    ),
  )
  writescenarioreport(REPORT_PATH, { ok: true, sessionkey, timeline })
}

export default validatetermbridge
