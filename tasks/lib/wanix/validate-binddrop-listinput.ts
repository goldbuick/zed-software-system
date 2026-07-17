import { PLAYWRIGHT_SCENARIO_TIMEOUT_MS } from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import {
  attachconsolecapture,
  binddroptostampedsession,
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
} from 'tasks/lib/wanix/playwrightzedcafe'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const REPORT_PATH = '/tmp/wanix-binddrop-listinput-report.json'
const STAMP = 'stamp-red.png'
const LISTINPUT = publicwanixfixture('listinput.wasm')

const validatelistinput: HeadedPlaywrightScript = async ({
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

  const fail = async (gate: string, extra: Record<string, unknown> = {}) => {
    writescenarioreport(REPORT_PATH, {
      failedgate: gate,
      timeline,
      recentlogs: consolelines.slice(-120),
      extra,
    })
    throw new Error(`wanix listinput validator failed at gate: ${gate}`)
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

  await dropwanixwasm(page, root, LISTINPUT, 'listinput.wasm')
  record('listinput-dropped')

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
    /listinput: (initial|empty|waiting)/,
    VALIDATE_TIMEOUT_MS,
    'listinput-started',
  )
  record('listinput-started')

  await binddroptostampedsession(page, root, sessionkey, STAMP)
  record('stamp-bound')

  const hit = await waitfortermorsubstring(
    page,
    root,
    consolelines,
    /listinput: ok stamp-red\.png \(95 bytes\)/,
    VALIDATE_TIMEOUT_MS,
    'listinput-stamp',
  )
  if (!hit) {
    await fail('listinput-stamp', { sessionkey })
  }
  record('listinput-stamp-ok')

  console.log(
    JSON.stringify(
      { ok: true, sessionkey, timeline, reportpath: REPORT_PATH },
      null,
      2,
    ),
  )
  writescenarioreport(REPORT_PATH, { ok: true, sessionkey, timeline })
}

export default validatelistinput
