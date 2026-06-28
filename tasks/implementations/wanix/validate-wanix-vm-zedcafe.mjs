/**
 * Full-app #wanix vm → /zed-cafe/ visibility gate (primary acceptance test).
 *
 * Requires dev server: yarn task app dev
 * Requires: npx playwright install chromium
 *
 * Hard script cap: WANIX_VM_VALIDATE_TIMEOUTS.SCRIPT_TOTAL_MS (default 6m).
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
  waitfor,
  waitforvmshell,
  readapilog,
} from './wanix-playwright-vm.mjs'

const log = (...a) => console.log('[wanix-vm-zedcafe-validate]', ...a)
const APILOG_KEY = '__wanixVmZedcafeApilog'

const browser = await chromium.launch({ headless: false })

try {
  await runwithscripttimeout(
    WANIX_VM_VALIDATE_TIMEOUTS.SCRIPT_TOTAL_MS,
    'wanix:vm:zed-cafe:validate',
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
          log('  [pg]', m.type(), t.slice(0, 160))
        }
      })

      page.on('pageerror', (err) => {
        log('pageerror:', err.message)
      })

      try {
        await openapp(page, DEFAULT_ZSS_URL, log)

        log('typing #wanix vm')
        await sendline(page, '#wanix vm')

        const exportmounted = await waitfor(
          page,
          'zed-cafe vm mount',
          async () => {
            const logs = await readapilog(page, APILOG_KEY)
            return logs.some((line) =>
              /#ramfs\/zed-cafe ready — remounting wanix-system with wanix-vm/.test(line),
            )
          },
          WANIX_VM_VALIDATE_TIMEOUTS.EXPORT_APILOG_MS,
          2000,
          log,
        )
        if (!exportmounted) {
          throw new Error('zed-cafe export never reached vm mount milestone')
        }
        log('Milestone A ok — #ramfs/zed-cafe ready, wanix-vm mounting')

        const booted = await waitforvmshell(page, log)
        if (!booted) {
          throw new Error('VM did not reach shell prompt')
        }
        log('Milestone B ok — VM shell')

        await focuscanvas(page)
        await assertguestzedcafe(page, log, { apilogKey: APILOG_KEY })

        log('PASS — /zed-cafe/ visible and readable after #wanix vm')
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
