import { PLAYWRIGHT_SCENARIO_TIMEOUT_MS } from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import {
  attachconsolecapture,
  dropwanixbundle,
  installplaywrightlogcapture,
  publicwanixfixture,
  waitforlogsubstring,
} from 'tasks/lib/wanix/playwrighthelpers'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import {
  type ZedcafeTimelineEntry,
  polliswanixready,
} from 'tasks/lib/wanix/playwrightzedcafe'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const BUNDLE = publicwanixfixture('bundle-one.tgz')

const validateidledrop: HeadedPlaywrightScript = async ({
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
  record('drop')

  await waitforlogsubstring(
    page,
    consolelines,
    'applyroom-remount',
    VALIDATE_TIMEOUT_MS,
    'task-room-remount',
  )
  record('task-room-remount')

  await waitforlogsubstring(
    page,
    consolelines,
    'drop-spawn',
    VALIDATE_TIMEOUT_MS,
    'drop-spawn',
  )
  record('drop-spawn')

  await page
    .frameLocator('iframe[title="wanix"]')
    .locator('wanix-task[id]')
    .first()
    .waitFor({ state: 'attached', timeout: VALIDATE_TIMEOUT_MS })
  record('task-attached')

  console.log(
    JSON.stringify(
      {
        ok: true,
        timeline,
      },
      null,
      2,
    ),
  )
}

export default validateidledrop
