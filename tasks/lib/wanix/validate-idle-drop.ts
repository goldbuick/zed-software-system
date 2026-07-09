import { readFileSync } from 'node:fs'
import path from 'node:path'

import { WANIX_PUBLIC_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'

const WANIX_IDLE_DROP_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS

async function readplaywrightlogs(
  page: import('@playwright/test').Page,
): Promise<string[]> {
  return page.evaluate(() => {
    const g = globalThis as { __playwrightLogs?: string[] }
    return g.__playwrightLogs ?? []
  })
}

async function dropwanixbundle(
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
        type: 'application/gzip',
      })
      emitwanixdropfile(register, registerreadplayer(), file)
    },
    { projectroot: root, filebytes: Array.from(bytes), label: filename },
  )
}

const validateidledrop: HeadedPlaywrightScript = async ({
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
  let wanixready = false
  page.on('pageerror', (err) => {
    console.error(`pageerror: ${err.message}`)
  })
  page.on('console', (msg) => {
    const text = msg.text()
    if (text.includes('[wanix] idle')) {
      wanixidle = true
    }
    if (text.includes('[wanix] ready')) {
      wanixready = true
    }
  })

  await page.goto(baseurl, {
    waitUntil: 'load',
    timeout: WANIX_IDLE_DROP_TIMEOUT_MS,
  })

  await withscripttimeout(
    'wanix-idle',
    WANIX_IDLE_DROP_TIMEOUT_MS,
    async () => {
      while (!wanixidle) {
        await page.waitForTimeout(250)
      }
    },
  )

  await waitforregistersession(page, root)

  const fixturepath = path.join(WANIX_PUBLIC_FIXTURES_DIR, 'bundle-one.tgz')
  await dropwanixbundle(page, root, fixturepath, 'bundle-one.tgz')

  await withscripttimeout(
    'wanix-bundle-starting',
    WANIX_IDLE_DROP_TIMEOUT_MS,
    async () => {
      for (;;) {
        const logs = await readplaywrightlogs(page)
        if (logs.some((line) => line.includes('wanix task room starting'))) {
          break
        }
        await page.waitForTimeout(250)
      }
    },
  )

  await withscripttimeout(
    'wanix-bundle-run',
    WANIX_IDLE_DROP_TIMEOUT_MS,
    async () => {
      for (;;) {
        const logs = await readplaywrightlogs(page)
        if (logs.some((line) => line.includes('wanix run'))) {
          break
        }
        await page.waitForTimeout(250)
      }
    },
  )

  await withscripttimeout(
    'wanix-bundle-ready',
    WANIX_IDLE_DROP_TIMEOUT_MS,
    async () => {
      while (!wanixready) {
        await page.waitForTimeout(500)
      }
    },
  )

  await withscripttimeout(
    'wanix-task-spawned',
    WANIX_IDLE_DROP_TIMEOUT_MS,
    async () => {
      const frame = page.frameLocator('iframe[title="wanix"]')
      for (;;) {
        const count = await frame.locator('wanix-task[id]').count()
        if (count >= 1) {
          break
        }
        await page.waitForTimeout(250)
      }
    },
  )
}

export default validateidledrop
