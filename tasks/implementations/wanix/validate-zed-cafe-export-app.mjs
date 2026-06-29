/**
 * Full-app zed-cafe VM export validator.
 *
 * Requires dev server: yarn task app dev
 * Requires: npx playwright install chromium
 */
import { chromium } from 'playwright'
import {
  DEFAULT_ZSS_URL,
  WANIX_VM_VALIDATE_TIMEOUTS,
  assertguestzedcafe,
  dumpfailurediagnostics,
  focuscanvas,
  installapilogcapture,
  openapp,
  runwithscripttimeout,
  sendline,
  waitforvmshell,
} from './wanix-playwright-vm.mjs'

const log = (...a) => console.log('[zed-cafe-app-validate]', ...a)
const APILOG_KEY = '__zedcafeApilog'

const browser = await chromium.launch({ headless: false })

try {
  await runwithscripttimeout(
    WANIX_VM_VALIDATE_TIMEOUTS.SCRIPT_TOTAL_MS,
    'wanix:zed-cafe:export:validate',
    async () => {
      const page = await browser.newPage({
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 800 },
      })
      page.setDefaultTimeout(WANIX_VM_VALIDATE_TIMEOUTS.VM_SHELL_MS)
      await installapilogcapture(page, APILOG_KEY)

      page.on('console', (m) => {
        const t = m.text()
        if (/zed-cafe export|gojs|wanix vm|error/i.test(t)) {
          console.log('  [pg]', m.type(), t.slice(0, 160))
        }
      })

      page.on('pageerror', (err) => {
        log('pageerror:', err.message)
      })

      try {
        await openapp(page, DEFAULT_ZSS_URL, log)
        log('typing #wanix vm')
        await sendline(page, '#wanix vm')
        const booted = await waitforvmshell(page, log)
        if (!booted) {
          throw new Error('VM did not reach shell prompt')
        }
        log('BOOTED')
        await focuscanvas(page)
        await assertguestzedcafe(page, log, { apilogKey: APILOG_KEY })
        log('PASS — /zed-cafe/stats.json readable in VM')
        process.exitCode = 0
      } catch (err) {
        log('FAILED:', err instanceof Error ? err.message : String(err))
        await dumpfailurediagnostics(page, log, APILOG_KEY)
        process.exitCode = 1
      } finally {
        await page.waitForTimeout(800)
        await page.close()
      }
    },
  )
} catch (err) {
  log('FAILED:', err instanceof Error ? err.message : String(err))
  process.exitCode = 1
} finally {
  await browser.close()
}
