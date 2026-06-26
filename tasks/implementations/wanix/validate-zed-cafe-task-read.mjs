/**
 * Validate zed-cafe WASI task read — minimal harness (no full app).
 *
 * Requires dev server: yarn task app dev
 * Requires: npx playwright install chromium
 * Requires: yarn task run wanix:wasm:build (zedcaferead.wat → .wasm)
 *
 * Exit 0 when manifest is mounted, task exits 0 (read succeeded).
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '../../..')
const WASM = join(ROOT, 'ops/fixtures/wanix/zedcaferead.wasm')
const URL =
  process.env.ZSS_URL ?? 'https://localhost:7777/wanix/zed-cafe-task-read.html'
const log = (...a) => console.log('[zed-cafe-task-read-validate]', ...a)

if (!existsSync(WASM)) {
  console.error(
    '[zed-cafe-task-read-validate] missing',
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
  const passed = await page.waitForFunction(
    () => {
      const result = window.zedcafeTaskReadResult
      return result && typeof result.pass === 'boolean'
    },
    { timeout: 120000 },
  )
  const evidence = await page.evaluate(() => window.zedcafeTaskReadResult)
  log(JSON.stringify(evidence, null, 2))
  if (!evidence?.pass) {
    process.exitCode = 1
  } else {
    log('PASS — task read zed-cafe/manifest.json')
    process.exitCode = 0
  }
  void passed
} catch (err) {
  const evidence = await page
    .evaluate(() => window.zedcafeTaskReadResult)
    .catch(() => null)
  log('FAILED:', err instanceof Error ? err.message : String(err))
  if (evidence) {
    log('evidence:', JSON.stringify(evidence, null, 2))
  }
  process.exitCode = 1
} finally {
  await browser.close()
}
