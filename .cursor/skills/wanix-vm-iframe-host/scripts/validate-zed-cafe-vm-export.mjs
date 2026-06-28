/**
 * Validate zed-cafe book export in a Wanix VM guest.
 *
 * Drives the REAL app (no product test hooks). Requires a dev server on
 * https://localhost:7777/ (`yarn task app dev`) and headed Chromium
 * (`npx playwright install chromium`).
 *
 * Run from repo root:
 *   node .cursor/skills/wanix-vm-iframe-host/scripts/validate-zed-cafe-vm-export.mjs
 *
 * Local validation only — not wired into CI or app:test.
 * Exit 0 = pass, 1 = error/no export.
 */
import { chromium } from 'playwright'

const URL = process.env.ZSS_URL ?? 'https://localhost:7777/'
const log = (...a) => console.log('[validate-zedcafe]', ...a)

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 800 },
})
const apilogs = []
page.on('console', (m) => {
  const t = m.text()
  if (/zed-cafe export|gojs|wanix vm|error/i.test(t)) {
    apilogs.push(t)
    console.log('  [pg]', m.type(), t.slice(0, 160))
  }
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
const readdiagnostics = async () => {
  const f = vmframe()
  if (!f) return null
  return f
    .evaluate(async () => {
      const sys = document.querySelector('wanix-system')
      const root = sys?.root
      const task = document.querySelector('wanix-task[id="zed-cafe"]')
      const rid = task?.rid ?? null
      if (!root || !rid) {
        return { rid, export: null, inbox: null }
      }
      let exportentries = null
      let inboxbytes = null
      try {
        exportentries = await root.readDir(`#task/${rid}/export`)
      } catch (err) {
        exportentries = String(err)
      }
      try {
        const raw = await root.readFile(`#task/${rid}/zed-cafe-inbox.json`)
        inboxbytes = raw instanceof Uint8Array ? raw.length : String(raw).length
      } catch (err) {
        inboxbytes = String(err)
      }
      return { rid, export: exportentries, inbox: inboxbytes }
    })
    .catch(() => null)
}
const readexportready = async () => {
  const diag = await readdiagnostics()
  if (!diag?.export || !Array.isArray(diag.export)) {
    return false
  }
  return diag.export.some((entry) => entry.replace(/\/$/, '') === 'stats.json')
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
  await page.goto(URL, { timeout: 60000, waitUntil: 'domcontentloaded' })
  await wait('canvas', async () => (await page.locator('canvas').count()) > 0, 30000)
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

  const exportready = await wait(
    'zed-cafe export tree',
    readexportready,
    120000,
    2000,
  )
  if (!exportready) {
    log('diagnostics:', JSON.stringify(await readdiagnostics()))
    log('apilog tail:\n' + apilogs.slice(-8).join('\n'))
    throw new Error('zed-cafe export did not complete (#task/rid/export missing stats.json)')
  }
  log('EXPORT READY (host-side)')

  await sendline('ls /')
  await page.waitForTimeout(1500)
  let buf = await readbuf()
  if (!/\bzed-cafe\b/.test(buf)) {
    log('ls / did not show zed-cafe; buffer tail:\n' + buf.split('\n').slice(-8).join('\n'))
    throw new Error('guest ls / missing zed-cafe/')
  }
  log('guest ls / shows zed-cafe/')

  await sendline('cat /zed-cafe/stats.json')
  const statsok = await wait(
    'stats.json in guest',
    async () => {
      buf = await readbuf()
      return /"bookCount"|"exportedAt"/.test(buf)
    },
    30000,
    1500,
  )
  if (!statsok) {
    log('cat tail:\n' + buf.split('\n').slice(-12).join('\n'))
    throw new Error('cat /zed-cafe/stats.json did not show JSON')
  }
  log('PASS — /zed-cafe/stats.json readable in VM')
  process.exitCode = 0
} catch (e) {
  log('FAILED:', e?.message || e)
  process.exitCode = 1
} finally {
  await page.waitForTimeout(800)
  await browser.close()
}
