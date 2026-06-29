/**
 * Validate zed-cafe gojs export write — minimal harness (no full app).
 *
 * Writes guestTouch into #task/<rid>/export/stats.json via root.writeFile (same
 * 9P path as pushzedcafeexportfiles). Proves ExportFS memfs accepts create/write
 * on the live gojs export namespace (MapFS could not).
 *
 * Guest WASI O_CREAT via zed-cafe bind is covered by exportfs_test.go and
 * wanix:zed-cafe:duplex:validate.
 *
 * Requires dev server: yarn task app dev
 * Requires: yarn task run wanix:zed-cafe:build
 * Requires: npx playwright install chromium
 */
import { chromium } from 'playwright'
import { readplaywrightheadless } from './wanix-playwright-launch.mjs'

const URL =
  process.env.ZSS_URL ??
  'https://localhost:7777/wanix/zed-cafe-export-write.html'
const log = (...a) => console.log('[zed-cafe-export-write-validate]', ...a)

const browser = await chromium.launch({ headless: readplaywrightheadless() })
const page = await browser.newPage({ ignoreHTTPSErrors: true })
page.setDefaultTimeout(120000)

try {
  await page.goto(URL, { timeout: 120000, waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const result = window.zedcafeExportWriteResult
      return result && typeof result.pass === 'boolean'
    },
    { timeout: 120000 },
  )
  const evidence = await page.evaluate(() => window.zedcafeExportWriteResult)
  log(JSON.stringify(evidence, null, 2))
  if (!evidence?.pass) {
    process.exitCode = 1
  } else {
    log('PASS — guestTouch in #task/rid/export via gojs memfs write')
    process.exitCode = 0
  }
} catch (err) {
  const evidence = await page
    .evaluate(() => window.zedcafeExportWriteResult)
    .catch(() => null)
  log('FAILED:', err instanceof Error ? err.message : String(err))
  if (evidence) {
    log('evidence:', JSON.stringify(evidence, null, 2))
  }
  process.exitCode = 1
} finally {
  await browser.close()
}
