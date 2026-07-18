import { PLAYWRIGHT_SCENARIO_TIMEOUT_MS } from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import {
  attachconsolecapture,
  installplaywrightlogcapture,
  waitforlogsubstring,
} from 'tasks/lib/wanix/playwrighthelpers'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import {
  type ZedcafeTimelineEntry,
  polliswanixready,
  sendwanixcli,
} from 'tasks/lib/wanix/playwrightzedcafe'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS

const validateidleboot: HeadedPlaywrightScript = async ({
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

  await sendwanixcli(page, root, '#wanix vm')
  record('vm-cli-sent')

  await waitforlogsubstring(
    page,
    consolelines,
    'applyroom-remount',
    VALIDATE_TIMEOUT_MS,
    'vm-remount',
  )
  record('vm-remount')

  await page
    .frameLocator('iframe[title="wanix"]')
    .locator('wanix-vm')
    .first()
    .waitFor({ state: 'attached', timeout: VALIDATE_TIMEOUT_MS })
  record('vm-attached')

  await waitforlogsubstring(
    page,
    consolelines,
    /applyroom-return.*"mode"\s*:\s*"vm"/,
    VALIDATE_TIMEOUT_MS,
    'vm-apply-return',
  )
  record('vm-apply-return')

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

export default validateidleboot
