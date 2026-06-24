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
const sttysize = async () => {
  const b = (await readbuf()).length
  await sendline('stty size')
  await wait('echo', async () => (await readbuf()).length > b, 8000, 400)
  await page.waitForTimeout(800)
  const buf = await readbuf()
  const m = [...buf.matchAll(/(?:^|\n)\s*(\d{1,3})\s+(\d{1,3})\s*(?=\n|$)/g)]
  const l = m[m.length - 1]
  return l ? { rows: +l[1], cols: +l[2] } : null
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

  const a = await sttysize()
  log('stty @1280:', JSON.stringify(a))
  const before = (await readbuf()).length
  await sendline('ls -la /usr/bin')
  await wait('ls', async () => (await readbuf()).length > before + 20, 8000, 400)
  await page.waitForTimeout(1000)
  const lsbuf = await readbuf()
  const maxlen = Math.max(...lsbuf.split('\n').map((l) => l.replace(/\s+$/, '').length))
  log(`ls maxlen=${maxlen} cols=${a?.cols}`)

  await page.setViewportSize({ width: 860, height: 800 })
  await page.waitForTimeout(4500)
  const b = await sttysize()
  log('stty @860:', JSON.stringify(b))

  const reflowok = a && maxlen <= a.cols
  const dynok = a && b && b.cols !== a.cols
  log(`reflow (ls <= cols): ${reflowok ? 'PASS' : 'FAIL'}`)
  log(`dynamic (cols change on resize): ${dynok ? 'PASS' : 'FAIL'}`)
  process.exitCode = reflowok && dynok ? 0 : 3
} catch (e) {
  log('FAILED:', e?.message || e)
  process.exitCode = 1
} finally {
  await page.waitForTimeout(800)
  await browser.close()
}
