/**
 * Validate zed-cafe gojs export — minimal harness (no full app).
 *
 * Requires dev server: yarn task app dev
 * Requires: npx playwright install chromium
 *
 * Exit 0 only when #task/<rid>/export/stats.json exists.
 */
import { chromium } from 'playwright'

const URL =
  process.env.ZSS_URL ?? 'https://localhost:7777/wanix/zed-cafe-export.html'
const log = (...a) => console.log('[zed-cafe-export-validate]', ...a)

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ ignoreHTTPSErrors: true })
page.setDefaultTimeout(120000)

try {
  await page.goto(URL, { timeout: 120000, waitUntil: 'domcontentloaded' })
  const passed = await page.waitForFunction(
    () => {
      const result = window.zedcafeExportResult
      return result && typeof result.pass === 'boolean'
    },
    { timeout: 120000 },
  )
  const evidence = await page.evaluate(() => window.zedcafeExportResult)
  log(JSON.stringify(evidence, null, 2))
  if (!evidence?.pass) {
    process.exitCode = 1
  } else {
    log('PASS — harness export stats.json ready')
    process.exitCode = 0
  }
  void passed
} catch (err) {
  const evidence = await page
    .evaluate(() => window.zedcafeExportResult)
    .catch(() => null)
  log('FAILED:', err instanceof Error ? err.message : String(err))
  if (evidence) {
    log('evidence:', JSON.stringify(evidence, null, 2))
  }
  process.exitCode = 1
} finally {
  await browser.close()
}
