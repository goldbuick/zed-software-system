import { writeFileSync } from 'node:fs'

import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'
import { WANIX_ZEDCAFE_EXPORT_READY_POLL_MS } from 'zss/feature/wanix/wanixzedcafeconstants'

export const WANIX_ZEDCAFE_VM_SESSION = 'linux-vm'
export const WANIX_ZEDCAFE_REPORT_PATH = '/tmp/wanix-zedcafe-export-report.json'

export type ZedcafeTimelineEntry = {
  ms: number
  label: string
  extra?: Record<string, unknown>
}

export type ZedcafeFailureReport = {
  failedgate: string
  timeline: ZedcafeTimelineEntry[]
  taskrid: string | null
  rpc: Record<string, unknown>
  readdirerrors: string[]
  walkbookserrors: string[]
  termdump: string
  recentlogs: string[]
}

const EXPORT_READDIR_RE = /#task\/\d+\/export.*file does not exist/i
const WALK_BOOKS_RE = /walk books\/.*file does not exist/i

export async function readplaywrightlogs(
  page: import('@playwright/test').Page,
): Promise<string[]> {
  return page.evaluate(() => {
    const g = globalThis as { __playwrightLogs?: string[] }
    return g.__playwrightLogs ?? []
  })
}

export async function sendwanixcli(
  page: import('@playwright/test').Page,
  root: string,
  cmd: string,
): Promise<void> {
  await page.evaluate(
    async ({ projectroot, line }) => {
      const { vmcli } = await import(`/@fs${projectroot}/zss/device/api.ts`)
      const { register, registerreadplayer } = await import(
        `/@fs${projectroot}/zss/device/register.ts`
      )
      vmcli(register, registerreadplayer(), line)
    },
    { projectroot: root, line: cmd },
  )
}

export async function polluntil<T>(
  label: string,
  budgetms: number,
  pollms: number,
  read: () => Promise<T>,
  ready: (value: T) => boolean,
): Promise<T> {
  const start = Date.now()
  return withscripttimeout(label, budgetms, async () => {
    for (;;) {
      const value = await read()
      if (ready(value)) {
        return value
      }
      if (Date.now() - start >= budgetms) {
        return value
      }
      await new Promise<void>((resolve) => setTimeout(resolve, pollms))
    }
  })
}

export async function waitwanixrpcping(
  page: import('@playwright/test').Page,
  budgetms = PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
): Promise<void> {
  await withscripttimeout('wanix-rpc-ping', budgetms, async () => {
    for (;;) {
      const ready = await page.evaluate(async () => {
        const g = globalThis as {
          waitwanixrpcping?: (ms?: number) => Promise<void>
          callwanixrpc?: (
            method: string,
            args?: unknown[],
            timeoutms?: number,
          ) => Promise<unknown>
        }
        if (typeof g.callwanixrpc !== 'function') {
          return false
        }
        if (typeof g.waitwanixrpcping === 'function') {
          await g.waitwanixrpcping(15_000)
          return true
        }
        const pong = await g.callwanixrpc('ping', [], 2_000).catch(() => null)
        return !!(pong as { ok?: boolean } | null)?.ok
      })
      if (ready) {
        return
      }
      await new Promise<void>((resolve) =>
        setTimeout(resolve, WANIX_ZEDCAFE_EXPORT_READY_POLL_MS),
      )
    }
  })
}

export async function callwanixrpcinpage<T>(
  page: import('@playwright/test').Page,
  method: string,
  args: unknown[] = [],
  timeoutms = 30_000,
): Promise<T> {
  return page.evaluate(
    async ({ rpcmethod, rpcargs, rpctimeoutms }) => {
      const g = globalThis as {
        callwanixrpc?: (
          method: string,
          args?: unknown[],
          timeoutms?: number,
        ) => Promise<unknown>
      }
      if (typeof g.callwanixrpc !== 'function') {
        throw new Error('callwanixrpc missing on page')
      }
      return g.callwanixrpc(rpcmethod, rpcargs, rpctimeoutms)
    },
    { rpcmethod: method, rpcargs: args, rpctimeoutms: timeoutms },
  ) as Promise<T>
}

export async function readtermbuffertext(
  page: import('@playwright/test').Page,
  root: string,
  sessionkey: string,
): Promise<string> {
  return page.evaluate(
    async ({ projectroot, key }) => {
      const { readwanixtermbuffer } = await import(
        `/@fs${projectroot}/zss/feature/wanix/wanixtermbuffer.ts`
      )
      const { readwanixtermlinecell } = await import(
        `/@fs${projectroot}/zss/feature/wanix/wanixtermclipboard.ts`
      )
      const buffer = readwanixtermbuffer(key)
      if (!buffer) {
        return ''
      }
      const lines: string[] = []
      const totallines = (buffer.scrollbackrows ?? 0) + buffer.rows
      for (let line = 0; line < totallines; line++) {
        let text = ''
        for (let col = 0; col < buffer.cols; col++) {
          const ch = readwanixtermlinecell(buffer, line, col).char
          text += ch >= 32 && ch <= 126 ? String.fromCharCode(ch) : ' '
        }
        lines.push(text.replace(/ +$/, ''))
      }
      return lines.join('\n')
    },
    { projectroot: root, key: sessionkey },
  )
}

export async function callwanixtermwriteinpage(
  page: import('@playwright/test').Page,
  root: string,
  data: string,
  sessionkey: string,
): Promise<void> {
  await page.evaluate(
    async ({ projectroot, payload, key }) => {
      const { callwanixtermwrite } = await import(
        `/@fs${projectroot}/zss/feature/wanix/wanixbridge.ts`
      )
      await callwanixtermwrite(payload, key)
    },
    { projectroot: root, payload: data, key: sessionkey },
  )
}

export function collectexportconsoleerrors(lines: string[]): {
  readdirerrors: string[]
  walkbookserrors: string[]
} {
  const readdirerrors: string[] = []
  const walkbookserrors: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (EXPORT_READDIR_RE.test(line)) {
      readdirerrors.push(line)
    }
    if (WALK_BOOKS_RE.test(line)) {
      walkbookserrors.push(line)
    }
  }
  return { readdirerrors, walkbookserrors }
}

export function writededcafefailurereport(report: ZedcafeFailureReport): void {
  writeFileSync(WANIX_ZEDCAFE_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)
}

export function failzedcafegate(
  gate: string,
  report: Omit<ZedcafeFailureReport, 'failedgate'>,
): never {
  writededcafefailurereport({ failedgate: gate, ...report })
  throw new Error(`zedcafe export validator failed at gate: ${gate}`)
}
