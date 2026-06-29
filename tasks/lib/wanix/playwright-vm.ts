import type { Page } from 'playwright'

import { withscripttimeout } from 'tasks/lib/parity/parity-timeouts'

export { withscripttimeout }

function readtimeoutms(envkey: string, fallback: number): number {
  const raw = process.env[envkey]
  if (!raw) {
    return fallback
  }
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** Per-milestone caps aligned with ops/fixtures/wanix plan gate 3. */
export const WANIX_VM_VALIDATE_TIMEOUTS = {
  SCRIPT_TOTAL_MS: readtimeoutms('ZSS_WANIX_VM_SCRIPT_TIMEOUT_MS', 420_000),
  APP_CANVAS_MS: 30_000,
  APP_WARMUP_MS: 8_000,
  VM_SHELL_MS: readtimeoutms('ZSS_WANIX_VM_SHELL_TIMEOUT_MS', 360_000),
  EXPORT_APILOG_MS: 90_000,
  LS_ROOT_MS: 30_000,
  LS_ZEDCAFE_MS: 20_000,
  CAT_STATS_MS: 30_000,
}

export function defaultzssurl(): string {
  return process.env.ZSS_URL ?? 'https://localhost:7777/'
}

export function vmframe(page: Page) {
  return page.frames().find((f) => f.url().includes('wanix-iframe-host.html'))
}

export async function readvmterm(page: Page): Promise<string> {
  const frame = vmframe(page)
  if (!frame) {
    return ''
  }
  return frame
    .evaluate(() => {
      const t = document.querySelector('wanix-term')?._term
      if (!t) {
        return ''
      }
      const active = t.buffer.active
      const lines: string[] = []
      for (let i = 0; i < active.length; i++) {
        lines.push(active.getLine(i)?.translateToString(true) ?? '')
      }
      return lines.join('\n')
    })
    .catch(() => '')
}

export async function waitfor(
  page: Page,
  label: string,
  pred: () => Promise<boolean>,
  ms: number,
  step = 2000,
  log: (...args: unknown[]) => void = console.log,
): Promise<boolean> {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (await pred()) {
      return true
    }
    const remaining = deadline - Date.now()
    if (remaining <= 0) {
      break
    }
    await page.waitForTimeout(Math.min(step, remaining))
  }
  log('TIMEOUT ' + label + ` (${ms}ms)`)
  return false
}

export async function sendline(page: Page, text: string) {
  await page.keyboard.type(text, { delay: 25 })
  await page.keyboard.press('Enter')
}

export async function focuscanvas(page: Page, x = 640, y = 400) {
  await page.mouse.click(x, y)
  await page.waitForTimeout(400)
}

export async function waitforvmshell(
  page: Page,
  log: (...args: unknown[]) => void,
  ms = WANIX_VM_VALIDATE_TIMEOUTS.VM_SHELL_MS,
): Promise<boolean> {
  return waitfor(
    page,
    'vm shell',
    async () => /~\s#/.test(await readvmterm(page)),
    ms,
    3000,
    log,
  )
}

export async function readapilog(page: Page, key = '__wanixVmApilog'): Promise<string[]> {
  return page.evaluate((storagekey) => window[storagekey as keyof Window] ?? [], key)
}

export function installapilogcapture(page: Page, key = '__wanixVmApilog') {
  return page.addInitScript((storagekey) => {
    window[storagekey as keyof Window] = [] as string[]
    window.addEventListener('message', (event) => {
      const data = event.data
      if (data?.type === 'zss-wanix-term-apilog' && typeof data.message === 'string') {
        ;(window[storagekey as keyof Window] as string[]).push(data.message)
      }
    })
  }, key)
}

export async function waitforzedcafeexportapilog(
  page: Page,
  log: (...args: unknown[]) => void,
  key = '__wanixVmApilog',
  ms = WANIX_VM_VALIDATE_TIMEOUTS.EXPORT_APILOG_MS,
) {
  const ready = await waitfor(
    page,
    'zed-cafe export ready',
    async () => {
      const logs = await readapilog(page, key)
      return logs.some(
        (line) =>
          /\/export ready/.test(line) ||
          /guest bind mounted from #task\//.test(line) ||
          /guest bind mounted from #ramfs\/zed-cafe/.test(line) ||
          /export ramfs bind mounted from #task\//.test(line) ||
          /guest zed-cafe ready/.test(line),
      )
    },
    ms,
    2000,
    log,
  )
  if (!ready) {
    const tail = (await readapilog(page, key)).slice(-12)
    log('apilog tail:', tail.join('\n'))
    throw new Error('zed-cafe export never became ready')
  }
}

export type Assertguestzedcafeopts = {
  rootTimeoutMs?: number
  listTimeoutMs?: number
  statsTimeoutMs?: number
  apilogKey?: string
  waitExportApilog?: boolean
  exportApilogMs?: number
}

export async function assertguestzedcafe(
  page: Page,
  log: (...args: unknown[]) => void,
  opts: Assertguestzedcafeopts = {},
): Promise<string> {
  const {
    rootTimeoutMs = WANIX_VM_VALIDATE_TIMEOUTS.LS_ROOT_MS,
    listTimeoutMs = WANIX_VM_VALIDATE_TIMEOUTS.LS_ZEDCAFE_MS,
    statsTimeoutMs = WANIX_VM_VALIDATE_TIMEOUTS.CAT_STATS_MS,
    apilogKey = '__wanixVmApilog',
    waitExportApilog = false,
    exportApilogMs = WANIX_VM_VALIDATE_TIMEOUTS.EXPORT_APILOG_MS,
  } = opts
  let buf = ''

  if (waitExportApilog) {
    await waitforzedcafeexportapilog(page, log, apilogKey, exportApilogMs)
  }

  await focuscanvas(page)

  await sendline(page, 'ls /')
  const rootok = await waitfor(
    page,
    'guest ls /',
    async () => {
      buf = await readvmterm(page)
      return /\bzed-cafe\b/.test(buf)
    },
    rootTimeoutMs,
    1500,
    log,
  )
  if (!rootok) {
    log('ls / buffer:\n' + buf.split('\n').slice(-15).join('\n'))
    throw new Error('guest ls / missing zed-cafe/')
  }
  log('Milestone C ok — zed-cafe visible in ls /')

  await sendline(page, 'ls /zed-cafe')
  const listok = await waitfor(
    page,
    'guest ls /zed-cafe',
    async () => {
      buf = await readvmterm(page)
      return /stats\.json/.test(buf)
    },
    listTimeoutMs,
    1500,
    log,
  )
  if (!listok) {
    log('ls /zed-cafe buffer:\n' + buf.split('\n').slice(-12).join('\n'))
    throw new Error('guest ls /zed-cafe missing stats.json')
  }
  log('Milestone D ok — stats.json listable')

  await sendline(page, 'cat /zed-cafe/stats.json')
  const statsok = await waitfor(
    page,
    'guest cat stats.json',
    async () => {
      buf = await readvmterm(page)
      return /"bookCount"|"exportedAt"/.test(buf)
    },
    statsTimeoutMs,
    1500,
    log,
  )
  if (!statsok) {
    log('cat tail:\n' + buf.split('\n').slice(-12).join('\n'))
    throw new Error('cat /zed-cafe/stats.json did not show JSON')
  }
  log('Milestone E ok — stats.json readable')
  return buf
}

export async function openapp(
  page: Page,
  url: string,
  log: (...args: unknown[]) => void,
) {
  const { APP_CANVAS_MS, APP_WARMUP_MS } = WANIX_VM_VALIDATE_TIMEOUTS
  await page.goto(url, { timeout: 60_000, waitUntil: 'domcontentloaded' })
  const canvasok = await waitfor(
    page,
    'canvas',
    async () => (await page.locator('canvas').count()) > 0,
    APP_CANVAS_MS,
    2000,
    log,
  )
  if (!canvasok) {
    throw new Error('app canvas never appeared')
  }
  await page.waitForTimeout(APP_WARMUP_MS)
  await focuscanvas(page)
}

export async function dumpfailurediagnostics(
  page: Page,
  log: (...args: unknown[]) => void,
  apilogkey: string,
) {
  try {
    const buf = await readvmterm(page)
    if (buf.trim()) {
      log('xterm tail:\n' + buf.split('\n').slice(-20).join('\n'))
    }
  } catch {
    // ignore
  }
  try {
    const tail = await readapilog(page, apilogkey)
    if (tail.length) {
      log('apilog tail:', tail.slice(-20).join('\n'))
    }
  } catch {
    // ignore
  }
}
