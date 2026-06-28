/**
 * Validate zed-cafe duplex guest write — minimal harness (no full app).
 *
 * Requires dev server: yarn task app dev
 * Requires: npx playwright install chromium
 * Requires: yarn task run wanix:wasm:build (zedcafewrite.wat → .wasm)
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '../../..')
const WASM = join(ROOT, 'ops/fixtures/wanix/zedcafewrite.wasm')
const URL =
  process.env.ZSS_URL ?? 'https://localhost:7777/wanix/zed-cafe-duplex.html'
const log = (...a) => console.log('[zed-cafe-duplex-validate]', ...a)

if (!existsSync(WASM)) {
  console.error(
    '[zed-cafe-duplex-validate] missing',
    WASM,
    '— run: yarn task run wanix:wasm:build',
  )
  process.exit(1)
}

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ ignoreHTTPSErrors: true })
page.setDefaultTimeout(120000)

try {
  await page.goto(URL, { timeout: 120000, waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const result = window.zedcafeDuplexResult
      return result && typeof result.pass === 'boolean'
    },
    { timeout: 120000 },
  )
  const evidence = await page.evaluate(() => window.zedcafeDuplexResult)
  log(JSON.stringify(evidence, null, 2))
  if (!evidence?.pass) {
    process.exitCode = 1
  } else {
    log('PASS — guest wrote guestTouch to zed-cafe/stats.json')
    process.exitCode = 0
  }
} catch (err) {
  const evidence = await page
    .evaluate(() => window.zedcafeDuplexResult)
    .catch(() => null)
  log('FAILED:', err instanceof Error ? err.message : String(err))
  if (evidence) {
    log('evidence:', JSON.stringify(evidence, null, 2))
  }
  process.exitCode = 1
} finally {
  await browser.close()
}
