/**
 * Full-app zed-cafe WASI task read validator.
 *
 * Requires dev server: yarn task app dev
 * Requires: npx playwright install chromium
 * Requires: yarn task run wanix:wasm:build
 */
import { chromium } from 'playwright'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DEFAULT_ZSS_URL,
  WANIX_VM_VALIDATE_TIMEOUTS,
  dumpfailurediagnostics,
  focuscanvas,
  installapilogcapture,
  openapp,
  runwithscripttimeout,
  sendline,
} from './wanix-playwright-vm.mjs'

const ROOT = join(import.meta.dirname, '../../..')
const WASM = join(ROOT, 'ops/fixtures/wanix/zedcaferead.wasm')
const log = (...a) => console.log('[zed-cafe-task-read-app-validate]', ...a)
const APILOG_KEY = '__zedcafeTaskReadApilog'

if (!existsSync(WASM)) {
  console.error(
    '[zed-cafe-task-read-app-validate] missing wasm — run: yarn task run wanix:wasm:build',
  )
  process.exit(1)
}

const browser = await chromium.launch({ headless: false })

try {
  await runwithscripttimeout(
    WANIX_VM_VALIDATE_TIMEOUTS.SCRIPT_TOTAL_MS,
    'wanix:zed-cafe:task-read:validate',
    async () => {
      const page = await browser.newPage({
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 800 },
      })
      page.setDefaultTimeout(WANIX_VM_VALIDATE_TIMEOUTS.VM_SHELL_MS)
      await installapilogcapture(page, APILOG_KEY)

      const wait = async (label, pred, ms, step = 2000) => {
        const deadline = Date.now() + ms
        while (Date.now() < deadline) {
          if (await pred()) {
            return true
          }
          await page.waitForTimeout(step)
        }
        log('TIMEOUT', label)
        return false
      }

      try {
        await openapp(page, DEFAULT_ZSS_URL, log)
        log('warm export via #wanix')
        await sendline(page, '#wanix')
        await page.waitForTimeout(2000)

        const wasmbytes = readFileSync(WASM)
        log('dropping zedcaferead.wasm (' + wasmbytes.length + ' bytes)')
        await page.evaluate(async (bytes) => {
          const file = new File([new Uint8Array(bytes)], 'zedcaferead.wasm', {
            type: 'application/wasm',
          })
          const dt = new DataTransfer()
          dt.items.add(file)
          const event = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
          })
          document.dispatchEvent(event)
        }, [...wasmbytes])

        const readok = await wait(
          'zed-cafe ok stdout',
          async () => {
            const logs = await page.evaluate((key) => window[key] ?? [], APILOG_KEY)
            return logs.some((line) => /zed-cafe ok:/i.test(line))
          },
          120000,
          2000,
        )
        if (!readok) {
          throw new Error('zedcaferead task did not print zed-cafe ok: on tile')
        }

        await focuscanvas(page)
        log('PASS — dropped WASI task read zed-cafe/stats.json')
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
