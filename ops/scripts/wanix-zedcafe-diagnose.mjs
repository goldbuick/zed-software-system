import { chromium } from '@playwright/test'
import fs from 'node:fs'

const BASE = process.env.WANIX_DIAG_URL ?? 'https://localhost:7777/'
const DEADLINE_MS = 60_000
const POLL_MS = 500

const logs = []
const errors = []

function stamp() {
  return Date.now()
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    ignoreHTTPSErrors: true,
  })
  const page = await browser.newPage()
  page.on('console', (msg) => {
    const line = `[${msg.type()}] ${msg.text()}`
    logs.push({ t: stamp(), line })
    if (msg.type() === 'error') {
      errors.push(line)
    }
  })
  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}`)
  })

  const start = stamp()
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 })

  const timeline = []
  const record = (label, extra = {}) => {
    timeline.push({ ms: stamp() - start, label, ...extra })
  }

  record('page loaded')

  await page.waitForFunction(
    () =>
      typeof globalThis.waitwanixready === 'function' &&
      typeof globalThis.callwanixrpc === 'function',
    { timeout: 30_000 },
  )
  record('wanix rpc globals present')

  await page.evaluate(async () => {
    if (typeof globalThis.waitwanixrpcping === 'function') {
      await globalThis.waitwanixrpcping(15_000)
    }
  })
  record('wanix rpc ping ok')

  const sample = async (label) => {
    return page.evaluate(async (samplelabel) => {
      const t0 = performance.now()
      const room = await globalThis
        .callwanixrpc('readroomstatus', [], 10_000)
        .catch((err) => ({ error: String(err) }))
      const taskrid = await globalThis
        .callwanixrpc('readzedcafetaskrid', [], 10_000)
        .catch((err) => ({ error: String(err) }))
      const exportfiles = await globalThis
        .callwanixrpc('readzedcafeexportfiles', [], 10_000)
        .catch((err) => ({ error: String(err) }))
      let exportstat = null
      let exportdir = null
      if (taskrid && typeof taskrid === 'string') {
        const statpath = `#task/${taskrid}/export/stats.json`
        const dirpath = `#task/${taskrid}/export`
        exportstat = await globalThis
          .callwanixrpc('readfile', [statpath], 5_000)
          .catch((err) => ({ error: String(err) }))
        exportdir = await globalThis
          .callwanixrpc('listdir', [dirpath], 5_000)
          .catch((err) => ({ error: String(err) }))
      }
      return {
        samplelabel,
        elapsedms: Math.round(performance.now() - t0),
        room,
        taskrid,
        exportfilecount: Array.isArray(exportfiles)
          ? exportfiles.length
          : null,
        exportstat,
        exportdir,
      }
    }, label)
  }

  let firstready = null
  while (stamp() - start < DEADLINE_MS) {
    const snap = await sample('poll')
    if (
      !firstready &&
      snap.taskrid &&
      typeof snap.taskrid === 'string' &&
      typeof snap.exportfilecount === 'number' &&
      snap.exportfilecount > 0
    ) {
      firstready = snap
      record('zedcafe export readable', {
        taskrid: snap.taskrid,
        exportfilecount: snap.exportfilecount,
        elapsedms: snap.elapsedms,
      })
      break
    }
    const room = snap.room
    if (room?.mode === 'idle') {
      record('still idle', { ms: stamp() - start })
    }
    await page.waitForTimeout(POLL_MS)
  }

  if (!firstready) {
    record('timeout waiting for zedcafe export')
    firstready = await sample('final')
  }

  const findplayers = await page.evaluate(async () => {
    const bytes = await fetch('/wanix/findplayers.wasm')
      .then((r) => r.arrayBuffer())
      .then((b) => Array.from(new Uint8Array(b)))
    const spawn = await globalThis
      .callwanixrpc(
        'spawntask',
        [`diag-findplayers-${Date.now()}`, 'findplayers.wasm'],
        60_000,
      )
      .catch((err) => ({ error: String(err) }))
    return { spawn, byteslen: bytes.length }
  })
  record('findplayers spawn attempted', findplayers)

  await page.waitForTimeout(5_000)

  const report = {
    base: BASE,
    durationms: stamp() - start,
    timeline,
    firstready,
    findplayers,
    readdirerrors: errors.filter((e) => e.includes('export')),
    allerrors: errors,
    recentlogs: logs.slice(-80).map((l) => l.line),
  }

  const out = '/tmp/wanix-zedcafe-diagnose.json'
  fs.writeFileSync(out, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
