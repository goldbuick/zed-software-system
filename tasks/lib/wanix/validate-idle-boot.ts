import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'

const WANIX_IDLE_BOOT_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS

async function readplaywrightlogs(
  page: import('@playwright/test').Page,
): Promise<string[]> {
  return page.evaluate(() => {
    const g = globalThis as { __playwrightLogs?: string[] }
    return g.__playwrightLogs ?? []
  })
}

async function sendwanixvmcli(
  page: import('@playwright/test').Page,
  root: string,
) {
  await page.evaluate(async (projectroot) => {
    const { vmcli } = await import(`/@fs${projectroot}/zss/device/api.ts`)
    const { register, registerreadplayer } = await import(
      `/@fs${projectroot}/zss/device/register.ts`
    )
    vmcli(register, registerreadplayer(), '#wanix vm')
  }, root)
}

const validateidleboot: HeadedPlaywrightScript = async ({
  page,
  baseurl,
  root,
}) => {
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

  let wanixidle = false
  page.on('console', (msg) => {
    if (msg.text().includes('[wanix] idle')) {
      wanixidle = true
    }
  })
  page.on('pageerror', (err) => {
    console.error(`pageerror: ${err.message}`)
  })

  await page.goto(baseurl, {
    waitUntil: 'load',
    timeout: WANIX_IDLE_BOOT_TIMEOUT_MS,
  })

  await withscripttimeout('wanix-idle', WANIX_IDLE_BOOT_TIMEOUT_MS, async () => {
    while (!wanixidle) {
      await page.waitForTimeout(250)
    }
  })

  await waitforregistersession(page, root)

  await sendwanixvmcli(page, root)

  await withscripttimeout('wanix-vm-starting', WANIX_IDLE_BOOT_TIMEOUT_MS, async () => {
    while (true) {
      const logs = await readplaywrightlogs(page)
      if (logs.some((line) => line.includes('wanix vm starting'))) {
        break
      }
      await page.waitForTimeout(250)
    }
  })

  await withscripttimeout('wanix-vm-started', WANIX_IDLE_BOOT_TIMEOUT_MS, async () => {
    while (true) {
      const logs = await readplaywrightlogs(page)
      if (logs.some((line) => line.includes('wanix vm started'))) {
        break
      }
      await page.waitForTimeout(500)
    }
  })
}

export default validateidleboot
