import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'
import { WANIX_ZEDCAFE_EXPORT_READY_POLL_MS } from 'zss/feature/wanix/wanixzedcafeconstants'

export const WANIX_ZEDCAFE_VM_SESSION = 'linux-vm'
export const WANIX_ZEDCAFE_REPORT_PATH = '/tmp/wanix-zedcafe-export-report.json'
export const WANIX_ZEDCAFE_REPORTS_DIR = 'ops/fixtures/wanix/reports'
export const EXPORT_TRACE_RE = /\[zedcafe-export\]/
export const WANIX_PERF_RE = /\[wanix-perf\] (\S+)(?: (.+))?/

export type ZedcafeStatsSnapshot = {
  bookCount: number
  exportedAt: string
  bytes: number
}

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
  termdumptail: string
  recentlogs: string[]
  hoststats?: ZedcafeStatsSnapshot | null
  gueststats?: ZedcafeStatsSnapshot | null
  hostexportpaths?: string[]
  membookcount?: number
  exporttrace?: string[]
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
  opts?: { tail?: number; viewportonly?: boolean },
): Promise<string> {
  return page.evaluate(
    async ({ projectroot, key, dumpopts }) => {
      const { readwanixtermbuffer } = await import(
        `/@fs${projectroot}/zss/feature/wanix/wanixtermbuffer.ts`
      )
      const { dumpwanixtermbuffertext } = await import(
        `/@fs${projectroot}/zss/feature/wanix/wanixtermtext.ts`
      )
      const buffer = readwanixtermbuffer(key)
      if (!buffer) {
        return ''
      }
      return dumpwanixtermbuffertext(buffer, dumpopts)
    },
    { projectroot: root, key: sessionkey, dumpopts: opts },
  )
}

export async function waitwanixtermcontains(
  page: import('@playwright/test').Page,
  root: string,
  sessionkey: string,
  pattern: string,
  budgetms = 30_000,
  pollms = 250,
): Promise<string> {
  return polluntil(
    `wanix-term-contains:${pattern}`,
    budgetms,
    pollms,
    () => readtermbuffertext(page, root, sessionkey),
    (text) => text.includes(pattern),
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

export function parsestatsjsonbytes(data: number[]): ZedcafeStatsSnapshot | null {
  if (data.length === 0) {
    return null
  }
  try {
    const parsed = JSON.parse(
      new TextDecoder().decode(new Uint8Array(data)),
    ) as {
      exportedAt?: unknown
      bookCount?: unknown
    }
    if (
      typeof parsed.exportedAt !== 'string' ||
      parsed.exportedAt.length === 0 ||
      typeof parsed.bookCount !== 'number'
    ) {
      return null
    }
    return {
      bookCount: parsed.bookCount,
      exportedAt: parsed.exportedAt,
      bytes: data.length,
    }
  } catch {
    return null
  }
}

export async function readmembookcountinpage(
  page: import('@playwright/test').Page,
  root: string,
): Promise<number> {
  return page.evaluate(async (projectroot) => {
    const { memoryreadbooklist } = await import(
      `/@fs${projectroot}/zss/memory/session.ts`
    )
    return memoryreadbooklist().length
  }, root)
}

export async function importfixturebookinpage(
  page: import('@playwright/test').Page,
  root: string,
  bookjson: string,
): Promise<number> {
  return page.evaluate(
    async ({ projectroot, payload }) => {
      const { memoryimportbookfromjson } = await import(
        `/@fs${projectroot}/zss/memory/bookoperations.ts`
      )
      const { memoryreadbooklist, memoryresetbooks } = await import(
        `/@fs${projectroot}/zss/memory/session.ts`
      )
      const parsed = JSON.parse(payload) as { data?: unknown }
      const flat = parsed.data ?? parsed
      const book = memoryimportbookfromjson(flat)
      if (!book) {
        throw new Error('memoryimportbookfromjson failed')
      }
      memoryresetbooks([book])
      return memoryreadbooklist().length
    },
    { projectroot: root, payload: bookjson },
  )
}

export function readfindplayersbookspaths(text: string): boolean {
  return /\["books\/[^"]+"/.test(text.replace(/\s+/g, ''))
}

export async function readwanixtermbufferkeysinpage(
  page: import('@playwright/test').Page,
  root: string,
): Promise<string[]> {
  return page.evaluate(async (projectroot) => {
    const { readwanixtermbufferkeys } = await import(
      `/@fs${projectroot}/zss/feature/wanix/wanixtermbuffer.ts`
    )
    return readwanixtermbufferkeys()
  }, root)
}

export async function pollfindplayersoutput(
  page: import('@playwright/test').Page,
  root: string,
  consolelines: string[],
  budgetms: number,
  pollms: number,
): Promise<string> {
  return polluntil(
    'findplayers-run',
    budgetms,
    pollms,
    async () => {
      for (const line of consolelines) {
        if (readfindplayersbookspaths(line)) {
          return line
        }
      }
      const keys = await readwanixtermbufferkeysinpage(page, root)
      for (const key of keys) {
        const text = await readtermbuffertext(page, root, key)
        if (readfindplayersbookspaths(text)) {
          return text
        }
      }
      return ''
    },
    (text) => readfindplayersbookspaths(text),
  )
}

export async function readhostexportstats(
  page: import('@playwright/test').Page,
  taskrid: string,
): Promise<ZedcafeStatsSnapshot | null> {
  const data = await callwanixrpcinpage<number[]>(
    page,
    'readfile',
    [`#task/${taskrid}/export/stats.json`],
    10_000,
  ).catch(() => [])
  if (!Array.isArray(data)) {
    return null
  }
  return parsestatsjsonbytes(data)
}

export async function readhostexportpaths(
  page: import('@playwright/test').Page,
  limit = 40,
): Promise<string[]> {
  const files = await callwanixrpcinpage<{ path: string; data: number[] }[]>(
    page,
    'readzedcafeexportfiles',
    [],
    30_000,
  ).catch(() => [])
  if (!Array.isArray(files)) {
    return []
  }
  return files.slice(0, limit).map((file) => file.path)
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

export function collectexporttrace(lines: string[]): string[] {
  const trace: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (EXPORT_TRACE_RE.test(line)) {
      trace.push(line)
    }
  }
  return trace
}

export function collectwanixperf(
  lines: string[],
  startms: number,
): ZedcafeTimelineEntry[] {
  const entries: ZedcafeTimelineEntry[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(WANIX_PERF_RE)
    if (!match) {
      continue
    }
    const label = match[1]
    let extra: Record<string, unknown> | undefined
    if (match[2]) {
      try {
        extra = JSON.parse(match[2]) as Record<string, unknown>
      } catch {
        extra = { raw: match[2] }
      }
    }
    const sinceanchor =
      typeof extra?.sinceanchor === 'number' ? extra.sinceanchor : undefined
    const elapsedms =
      typeof extra?.elapsedms === 'number' ? extra.elapsedms : undefined
    entries.push({
      ms:
        sinceanchor ??
        elapsedms ??
        startms,
      label,
      extra,
    })
  }
  return entries
}

/** True when ls -la output lists a books directory entry under /zedcafe. */
export function readlslistsbooksdir(text: string): boolean {
  const lines = text.split('\n')
  let afterls = false
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (/ls\s+(-la\s+)?\/zedcafe/.test(trimmed)) {
      afterls = true
      continue
    }
    if (!afterls) {
      continue
    }
    if (trimmed.length === 0) {
      continue
    }
    if (/^books\/?$/.test(trimmed)) {
      return true
    }
    if (/\sbooks\/?$/.test(trimmed)) {
      return true
    }
  }
  return false
}

export function parsebookcountfromterm(text: string, aftercommand = 'zedcafe-stats'): number | null {
  const lines = text.split('\n')
  let aftercmd = aftercommand.length === 0
  for (let i = 0; i < lines.length; i++) {
    if (aftercommand && lines[i].includes(aftercommand)) {
      aftercmd = true
      continue
    }
    if (!aftercmd) {
      continue
    }
    const match = lines[i].match(/"bookCount"\s*:\s*(\d+)/)
    if (match) {
      return Number(match[1])
    }
  }
  return null
}

export function writededcafefailurereport(
  report: ZedcafeFailureReport,
  root?: string,
): void {
  const body = `${JSON.stringify(report, null, 2)}\n`
  writeFileSync(WANIX_ZEDCAFE_REPORT_PATH, body)
  if (root) {
    const dir = path.join(root, WANIX_ZEDCAFE_REPORTS_DIR)
    mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    writeFileSync(path.join(dir, `zedcafe-export-${stamp}.json`), body)
  }
}

export function failzedcafegate(
  gate: string,
  report: Omit<ZedcafeFailureReport, 'failedgate'>,
  root?: string,
): never {
  writededcafefailurereport({ failedgate: gate, ...report }, root)
  throw new Error(`zedcafe export validator failed at gate: ${gate}`)
}
