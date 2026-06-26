/**
 * Validate the app-host Wanix VM boot + tile->guest terminal sizing.
 *
 * Drives the REAL app (no product test hooks); reads the iframe xterm buffer
 * via frame.evaluate. Requires a dev server on https://localhost:7777/
 * (`yarn task app dev`) and a headed Chromium (`npx playwright install chromium`).
 *
 * Run from repo root: node .cursor/skills/wanix-vm-iframe-host/scripts/validate-wanix-vm.mjs
 * Exit 0 = pass, 3 = sizing assertion failed, 1 = error/no boot.
 */
import { chromium } from 'playwright'

const URL = process.env.ZSS_URL ?? 'https://localhost:7777/'
const log = (...a) => console.log('[validate]', ...a)

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 800 },
})
page.on('console', (m) => {
  const t = m.text()
  if (/vm started|wanix vm|error/i.test(t)) console.log('  [pg]', m.type(), t.slice(0, 140))
})

const vmframe = () => page.frames().find((f) => f.url().includes('wanix-iframe-host.html'))
const readbuf = async () => {
  const f = vmframe()
  if (!f) return ''
  return f
    .evaluate(() => {
      const t = document.querySelector('wanix-term')?._term
      if (!t) return ''
      const a = t.buffer.active
      const o = []
      for (let i = 0; i < a.length; i++) o.push(a.getLine(i)?.translateToString(true) ?? '')
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
// Sizing is display-side: read the xterm grid the FitAddon computed from the
// host-set iframe pixel size. Do NOT use stty/winch/guest winsize.
const gridsize = async () => {
  const f = vmframe()
  if (!f) return null
  return f
    .evaluate(() => {
      const t = document.querySelector('wanix-term')?._term
      return t ? { cols: t.cols, rows: t.rows } : null
    })
    .catch(() => null)
}

try {
  await page.goto(URL, { timeout: 60000, waitUntil: 'domcontentloaded' })
  await wait('canvas', async () => page.locator('canvas').count(), 30000)
  await page.waitForTimeout(8000)
  await page.mouse.click(640, 400)
  await page.waitForTimeout(400)

  log('typing #wanix vm')
  await sendline('#wanix vm')
  const booted = await wait('vm prompt', async () => /~\s#/.test(await readbuf()), 150000, 3000)
  if (!booted) {
    log('tail:\n' + (await readbuf()).split('\n').slice(-12).join('\n'))
    throw new Error('VM did not reach shell prompt')
  }
  log('BOOTED')

  const a = await gridsize()
  log('grid @1280:', JSON.stringify(a))

  await page.setViewportSize({ width: 860, height: 800 })
  await page.waitForTimeout(4500)
  const b = await gridsize()
  log('grid @860:', JSON.stringify(b))

  const haveok = a && a.cols > 0 && a.rows > 0
  const dynok = a && b && b.cols !== a.cols
  log(`grid present: ${haveok ? 'PASS' : 'FAIL'}`)
  log(`dynamic (cols change on resize): ${dynok ? 'PASS' : 'FAIL'}`)
  process.exitCode = haveok && dynok ? 0 : 3
} catch (e) {
  log('FAILED:', e?.message || e)
  process.exitCode = 1
} finally {
  await page.waitForTimeout(800)
  await browser.close()
}
