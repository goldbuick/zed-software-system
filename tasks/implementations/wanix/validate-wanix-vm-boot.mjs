/**
 * Full-app #wanix vm boot validator (post-duplex regression gate).
 *
 * Requires dev server: yarn task app dev
 * Requires: npx playwright install chromium
 */
import { chromium } from 'playwright'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DEFAULT_ZSS_URL,
  WANIX_VM_VALIDATE_TIMEOUTS,
  assertguestzedcafe,
  dumpfailurediagnostics,
  focuscanvas,
  installapilogcapture,
  openapp,
  readapilog,
  runwithscripttimeout,
  sendline,
  waitfor,
  waitforvmshell,
} from './wanix-playwright-vm.mjs'

const ROOT = join(import.meta.dirname, '../../..')
const BOOK = join(ROOT, 'ops/fixtures/books/example-coolregionsbow.book.json')
const log = (...a) => console.log('[wanix-vm-boot-validate]', ...a)

const BOOT_SCRIPT_TOTAL_MS =
  WANIX_VM_VALIDATE_TIMEOUTS.SCRIPT_TOTAL_MS + 60_000

if (!existsSync(BOOK)) {
  console.error('[wanix-vm-boot-validate] missing book fixture', BOOK)
  process.exit(1)
}

const browser = await chromium.launch({ headless: false })

const dropbook = async (page) => {
  const bytes = readFileSync(BOOK)
  await page.evaluate(async (payload) => {
    const file = new File([new Uint8Array(payload)], 'example-coolregionsbow.book.json', {
      type: 'application/json',
    })
    const dt = new DataTransfer()
    dt.items.add(file)
    const event = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt,
    })
    document.dispatchEvent(event)
  }, [...bytes])
}

try {
  await runwithscripttimeout(
    BOOT_SCRIPT_TOTAL_MS,
    'wanix:vm:boot:validate',
    async () => {
      const page = await browser.newPage({
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 800 },
      })
      page.setDefaultTimeout(WANIX_VM_VALIDATE_TIMEOUTS.VM_SHELL_MS)

      const readdirnoise = []
      const APILOG_KEY = '__wanixVmBootApilog'

      await installapilogcapture(page, APILOG_KEY)

      page.on('console', (m) => {
        const t = m.text()
        if (/readdir.*invalid argument/i.test(t)) {
          readdirnoise.push(t)
        }
        if (/zed-cafe export|gojs|wanix vm|error/i.test(t)) {
          log('  [pg]', m.type(), t.slice(0, 160))
        }
      })

      try {
        await openapp(page, DEFAULT_ZSS_URL, log)

        log('import coolregionsbow book')
        await dropbook(page)
        await page.waitForTimeout(3000)

        log('typing #wanix vm')
        const vmstart = Date.now()
        await sendline(page, '#wanix vm')

        const milestonea = await waitfor(
          page,
          'milestone A vm export mount',
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
        if (!milestonea) {
          const tail = (await readapilog(page, APILOG_KEY)).slice(-12)
          log('apilog tail:', tail.join('\n'))
          throw new Error(
            'Milestone A failed — export never reached vm remount within timeout',
          )
        }
        log(`Milestone A ok (${Date.now() - vmstart}ms)`)

        const booted = await waitforvmshell(page, log)
        if (!booted) {
          throw new Error('Milestone B failed — VM did not reach shell prompt')
        }
        log('Milestone B ok')

        await focuscanvas(page)
        await assertguestzedcafe(page, log, { apilogKey: APILOG_KEY })

        if (readdirnoise.length > 5) {
          log('Milestone F warn — readdir noise count', readdirnoise.length)
        }

        log('PASS — #wanix vm boot with seeded export')
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
