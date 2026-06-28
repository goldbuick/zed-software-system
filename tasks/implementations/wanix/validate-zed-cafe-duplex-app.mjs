/**
 * Full-app zed-cafe duplex validator — guest write + #wanix pull import.
 *
 * Requires dev server: yarn task app dev
 * Requires: npx playwright install chromium
 * Requires: yarn task run wanix:wasm:build
 */
import { chromium } from 'playwright'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '../../..')
const WASM = join(ROOT, 'ops/fixtures/wanix/zedcafewrite.wasm')
const URL = process.env.ZSS_URL ?? 'https://localhost:7777/'
const log = (...a) => console.log('[zed-cafe-duplex-app-validate]', ...a)

if (!existsSync(WASM)) {
  console.error('[zed-cafe-duplex-app-validate] missing wasm — run wanix:wasm:build')
  process.exit(1)
}

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 800 },
})
page.setDefaultTimeout(180000)
const apilogs = []

await page.addInitScript(() => {
  window.__zedcafeApilog = []
  window.addEventListener('message', (event) => {
    const data = event.data
    if (data?.type === 'zss-wanix-term-apilog' && typeof data.message === 'string') {
      window.__zedcafeApilog.push(data.message)
    }
  })
})

page.on('console', (m) => {
  const t = m.text()
  if (/zed-cafe|wanix|error/i.test(t)) {
    apilogs.push(t)
  }
})

const wait = async (label, pred, ms, step = 2000) => {
  const dl = Date.now() + ms
  while (Date.now() < dl) {
    if (await pred()) {
      return true
    }
    await page.waitForTimeout(step)
  }
  log('TIMEOUT ' + label)
  return false
}

const sendline = async (s) => {
  await page.keyboard.type(s, { delay: 25 })
  await page.keyboard.press('Enter')
}

try {
  await page.goto(URL, { timeout: 60000, waitUntil: 'domcontentloaded' })
  await wait('canvas', async () => (await page.locator('canvas').count()) > 0, 30000)
  await page.waitForTimeout(8000)
  await page.mouse.click(640, 400)
  await page.waitForTimeout(400)

  log('trigger zed-cafe export via #wanix pull prep')
  await sendline('#wanix')
  await page.waitForTimeout(1500)

  const wasmbytes = readFileSync(WASM)
  log('dropping zedcafewrite.wasm (' + wasmbytes.length + ' bytes)')
  await page.evaluate(async (bytes) => {
    const file = new File([new Uint8Array(bytes)], 'zedcafewrite.wasm', {
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

  const writeok = await wait(
    'guest write stdout',
    async () => {
      const logs = await page.evaluate(() => window.__zedcafeApilog ?? [])
      return logs.some((line) => /zed-cafe write ok/i.test(line))
    },
    120000,
    2000,
  )
  if (!writeok) {
    throw new Error('zedcafewrite task did not report success in apilog')
  }

  log('pull guest tree into memory')
  await sendline('#wanix pull')
  const imported = await wait(
    'import apilog',
    async () => {
      const logs = await page.evaluate(() => window.__zedcafeApilog ?? [])
      return logs.some((line) => /zed-cafe import:/i.test(line))
    },
    30000,
    1500,
  )
  if (!imported) {
    throw new Error('#wanix pull did not log zed-cafe import')
  }

  log('PASS — guest write + pull import')
  process.exitCode = 0
} catch (err) {
  log('FAILED:', err instanceof Error ? err.message : String(err))
  log('apilog tail:', apilogs.slice(-12).join('\n'))
  process.exitCode = 1
} finally {
  await page.waitForTimeout(800)
  await browser.close()
}
