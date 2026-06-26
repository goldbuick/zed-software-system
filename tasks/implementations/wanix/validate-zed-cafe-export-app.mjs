/**
 * Full-app zed-cafe VM export validator.
 *
 * Requires dev server: yarn task app dev
 * Requires: npx playwright install chromium
 */
import { chromium } from 'playwright'

const URL = process.env.ZSS_URL ?? 'https://localhost:7777/'
const log = (...a) => console.log('[zed-cafe-app-validate]', ...a)

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 800 },
})
page.setDefaultTimeout(120000)
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
  if (/zed-cafe export|gojs|wanix vm|error/i.test(t)) {
    apilogs.push(t)
    console.log('  [pg]', m.type(), t.slice(0, 160))
  }
})

page.on('pageerror', (err) => {
  apilogs.push(`pageerror: ${err.message}`)
})

const vmframe = () =>
  page.frames().find((f) => f.url().includes('wanix-iframe-host.html'))

const readbuf = async () => {
  const f = vmframe()
  if (!f) return ''
  return f
    .evaluate(() => {
      const t = document.querySelector('wanix-term')?._term
      if (!t) return ''
      const a = t.buffer.active
      const o = []
      for (let i = 0; i < a.length; i++) {
        o.push(a.getLine(i)?.translateToString(true) ?? '')
      }
      return o.join('\n')
    })
    .catch(() => '')
}

const wait = async (label, pred, ms, step = 2000) => {
  const dl = Date.now() + ms
  while (Date.now() < dl) {
    if (await pred()) return true
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
  let buf = ''
  await page.goto(URL, { timeout: 60000, waitUntil: 'domcontentloaded' })
  await wait('canvas', async () => (await page.locator('canvas').count()) > 0, 30000)
  await page.waitForTimeout(8000)
  await page.mouse.click(640, 400)
  await page.waitForTimeout(400)

  log('typing #wanix vm')
  await sendline('#wanix vm')
  const booted = await wait(
    'vm prompt',
    async () => /~\s#/.test(await readbuf()),
    240000,
    3000,
  )
  if (!booted) {
    throw new Error('VM did not reach shell prompt')
  }
  log('BOOTED')

  await page.mouse.click(640, 400)
  await page.waitForTimeout(400)

  await sendline('ls /')
  const lswok = await wait(
    'guest ls /',
    async () => {
      buf = await readbuf()
      return /\bzed-cafe\b/.test(buf) || /\bbin\b/.test(buf)
    },
    20000,
    1500,
  )
  if (!lswok) {
    log('ls / buffer:\n' + buf.split('\n').slice(-15).join('\n'))
    throw new Error('guest ls / did not return directory listing')
  }
  if (!/\bzed-cafe\b/.test(buf)) {
    log('ls / buffer:\n' + buf.split('\n').slice(-10).join('\n'))
    throw new Error('guest ls / missing zed-cafe/')
  }

  await sendline('cat /zed-cafe/manifest.json')
  const manifestok = await wait(
    'manifest.json in guest',
    async () => {
      buf = await readbuf()
      return /"bookCount"|"exportedAt"/.test(buf)
    },
    30000,
    1500,
  )
  if (!manifestok) {
    log('cat tail:\n' + buf.split('\n').slice(-12).join('\n'))
    throw new Error('cat /zed-cafe/manifest.json did not show JSON')
  }

  log('PASS — /zed-cafe/manifest.json readable in VM')
  process.exitCode = 0
} catch (err) {
  log('FAILED:', err instanceof Error ? err.message : String(err))
  process.exitCode = 1
} finally {
  await page.waitForTimeout(800)
  await browser.close()
}
