/**
 * Full-app zed-cafe list validator — drop zedcafelist.wasm after export warm.
 *
 * Requires dev server: yarn task app dev
 * Requires: npx playwright install chromium
 * Requires: yarn task run wanix:wasm:build:c (zedcafelist.c → .wasm)
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
  readapilog,
  readvmterm,
  runwithscripttimeout,
  sendline,
  waitfor,
} from './wanix-playwright-vm.mjs'

const ROOT = join(import.meta.dirname, '../../..')
const WASM = join(ROOT, 'ops/fixtures/wanix/zedcafelist.wasm')
const APILOG_KEY = '__zedcafeListApilog'
const log = (...a) => console.log('[zed-cafe-list-app-validate]', ...a)

if (!existsSync(WASM)) {
  console.error(
    '[zed-cafe-list-app-validate] missing wasm — run: yarn task run wanix:wasm:build:c',
  )
  process.exit(1)
}

const browser = await chromium.launch({ headless: false })

try {
  await runwithscripttimeout(
    WANIX_VM_VALIDATE_TIMEOUTS.SCRIPT_TOTAL_MS,
    'zed-cafe-list-app-validate',
    async () => {
      const page = await browser.newPage({
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 800 },
      })
      page.setDefaultTimeout(WANIX_VM_VALIDATE_TIMEOUTS.VM_SHELL_MS)

      const consoleerrors = []
      await installapilogcapture(page, APILOG_KEY)

      page.on('console', (m) => {
        const t = m.text()
        if (
          /#task\/\d+\/export.*does not exist/i.test(t) ||
          /readdir.*file does not exist/i.test(t)
        ) {
          consoleerrors.push(t)
        }
        if (/zed-cafe export|gojs|wanix|error/i.test(t)) {
          log('  [pg]', m.type(), t.slice(0, 160))
        }
      })

      try {
        await openapp(page, DEFAULT_ZSS_URL, log)
        log('warming wanix + zed-cafe export via #wanix pull')
        await sendline(page, '#wanix pull')
        log('waiting for zed-cafe guest bind')
        const guestbound = await waitfor(
          page,
          'guest zed-cafe bind',
          async () => {
            const logs = await readapilog(page, APILOG_KEY)
            return logs.some(
              (line) =>
                /guest bind mounted from #ramfs\/zed-cafe/.test(line) ||
                /guest zed-cafe ready/.test(line) ||
                /staged \d+ files on #ramfs\/zed-cafe/.test(line),
            )
          },
          WANIX_VM_VALIDATE_TIMEOUTS.EXPORT_APILOG_MS,
          2000,
          log,
        )
        if (!guestbound) {
          throw new Error('zed-cafe guest bind never mounted')
        }
        await page.waitForTimeout(500)

        const wasmbytes = readFileSync(WASM)
        log('dropping zedcafelist.wasm (' + wasmbytes.length + ' bytes)')
        await page.evaluate(async (bytes) => {
          const file = new File([new Uint8Array(bytes)], 'zedcafelist.wasm', {
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
        await focuscanvas(page)

        const listok = await waitfor(
          page,
          'zed-cafe list output',
          async () => {
            const buf = await readvmterm(page)
            return (
              /zed-cafe list/i.test(buf) &&
              /stats\.json/.test(buf) &&
              !/zed-cafe missing/i.test(buf)
            )
          },
          120_000,
          2000,
          log,
        )
        if (!listok) {
          const buf = await readvmterm(page)
          log('term buffer tail:\n' + buf.split('\n').slice(-15).join('\n'))
          throw new Error('zedcafelist did not print zed-cafe tree with stats.json')
        }

        if (consoleerrors.length > 0) {
          throw new Error(
            'console export errors: ' + consoleerrors.slice(0, 3).join(' | '),
          )
        }

        log('PASS — zed-cafe list shows stats.json after export warm')
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
