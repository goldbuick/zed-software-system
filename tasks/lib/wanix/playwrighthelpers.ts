import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { WANIX_PUBLIC_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'
import {
  type ZedcafeTimelineEntry,
  polluntil,
  readplaywrightlogs,
  readtermbuffertext,
  readwanixtermbufferkeysinpage,
} from 'tasks/lib/wanix/playwrightzedcafe'
import { WANIX_ZEDCAFE_EXPORT_READY_POLL_MS } from 'zss/feature/wanix/wanixzedcafeconstants'

export const WANIX_VALIDATE_POLL_MS = WANIX_ZEDCAFE_EXPORT_READY_POLL_MS

export function publicwanixfixture(...parts: string[]): string {
  return path.join(WANIX_PUBLIC_FIXTURES_DIR, ...parts)
}

export function writescenarioreport(
  reportpath: string,
  report: Record<string, unknown>,
): void {
  writeFileSync(reportpath, `${JSON.stringify(report, null, 2)}\n`)
}

export async function installplaywrightlogcapture(
  page: import('@playwright/test').Page,
): Promise<void> {
  await page.addInitScript(() => {
    const g = globalThis as {
      __nodeLog?: (line: string) => void
      __playwrightLogs?: string[]
    }
    g.__playwrightLogs = []
    g.__nodeLog = (line: string) => {
      g.__playwrightLogs?.push(line)
    }
  })
}

export function attachconsolecapture(
  page: import('@playwright/test').Page,
  consolelines: string[],
  timeline?: ZedcafeTimelineEntry[],
  startms?: number,
): void {
  const t0 = startms ?? Date.now()
  page.on('pageerror', (err) => {
    consolelines.push(`[pageerror] ${err.message}`)
  })
  page.on('console', (msg) => {
    const text = msg.text()
    consolelines.push(`[${msg.type()}] ${text}`)
    if (!timeline) {
      return
    }
    const perfmatch = /\[wanix-perf\] (\S+)(?: (.+))?$/.exec(text)
    if (!perfmatch) {
      return
    }
    let extra: Record<string, unknown> | undefined
    if (perfmatch[2]) {
      try {
        extra = JSON.parse(perfmatch[2]) as Record<string, unknown>
      } catch {
        extra = { raw: perfmatch[2] }
      }
    }
    timeline.push({
      ms: Date.now() - t0,
      label: perfmatch[1],
      extra,
    })
  })
}

export async function dropwanixwasm(
  page: import('@playwright/test').Page,
  root: string,
  fixturepath: string,
  filename: string,
): Promise<void> {
  const bytes = readFileSync(fixturepath)
  await page.evaluate(
    async ({ projectroot, filebytes, label }) => {
      const { wanixserverdrop } = await import(
        `/@fs${projectroot}/zss/device/api.ts`
      )
      const { SOFTWARE } = await import(
        `/@fs${projectroot}/zss/device/session.ts`
      )
      const { registerreadplayer } = await import(
        `/@fs${projectroot}/zss/device/registerplayer.ts`
      )
      wanixserverdrop(
        SOFTWARE,
        registerreadplayer(),
        label,
        'wasm',
        new Uint8Array(filebytes),
      )
    },
    {
      projectroot: root,
      filebytes: Array.from(bytes),
      label: filename,
    },
  )
}

export async function dropwanixbundle(
  page: import('@playwright/test').Page,
  root: string,
  fixturepath: string,
  filename: string,
): Promise<void> {
  const bytes = readFileSync(fixturepath)
  await page.evaluate(
    async ({ projectroot, filebytes, label }) => {
      const { wanixserverdrop } = await import(
        `/@fs${projectroot}/zss/device/api.ts`
      )
      const { SOFTWARE } = await import(
        `/@fs${projectroot}/zss/device/session.ts`
      )
      const { registerreadplayer } = await import(
        `/@fs${projectroot}/zss/device/registerplayer.ts`
      )
      wanixserverdrop(
        SOFTWARE,
        registerreadplayer(),
        label,
        'bundle',
        new Uint8Array(filebytes),
      )
    },
    {
      projectroot: root,
      filebytes: Array.from(bytes),
      label: filename,
    },
  )
}

export async function readattachedsessioninpage(
  page: import('@playwright/test').Page,
  root: string,
): Promise<string | null> {
  return page.evaluate(async (projectroot) => {
    const { readattachedsession } = await import(
      `/@fs${projectroot}/zss/device/wanixclient/wanixdisplay.ts`
    )
    return readattachedsession()
  }, root)
}

export async function waitforattachedsession(
  page: import('@playwright/test').Page,
  root: string,
  budgetms = PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
): Promise<string> {
  return withscripttimeout('attached-session', budgetms, async () => {
    for (;;) {
      const key = await readattachedsessioninpage(page, root)
      if (key) {
        return key
      }
      await page.waitForTimeout(WANIX_VALIDATE_POLL_MS)
    }
  })
}

export async function binddroptostampedsession(
  page: import('@playwright/test').Page,
  root: string,
  sessionkey: string,
  stampname: string,
): Promise<void> {
  const stamppath = publicwanixfixture(stampname)
  const bytes = readFileSync(stamppath)
  await page.evaluate(
    async ({ projectroot, key, label, filebytes }) => {
      const { wanixserverbinddrop } = await import(
        `/@fs${projectroot}/zss/device/api.ts`
      )
      const { SOFTWARE } = await import(
        `/@fs${projectroot}/zss/device/session.ts`
      )
      const { registerreadplayer } = await import(
        `/@fs${projectroot}/zss/device/registerplayer.ts`
      )
      const {
        readwanixbinddropdst,
        readwanixbinddropkind,
        readwanixbinddropperm,
      } = await import(
        `/@fs${projectroot}/zss/device/wanixclient/wanixbindpaths.ts`
      )
      const kind = readwanixbinddropkind(label)
      wanixserverbinddrop(SOFTWARE, registerreadplayer(), key, {
        label,
        kind,
        bytes: new Uint8Array(filebytes),
        dst: readwanixbinddropdst(label, kind),
        perm: readwanixbinddropperm(label),
      })
    },
    {
      projectroot: root,
      key: sessionkey,
      label: stampname,
      filebytes: Array.from(bytes),
    },
  )
}

export async function readalltermtext(
  page: import('@playwright/test').Page,
  root: string,
): Promise<string> {
  const keys = await readwanixtermbufferkeysinpage(page, root)
  const chunks: string[] = []
  for (const key of keys) {
    const text = await readtermbuffertext(page, root, key)
    if (text) {
      chunks.push(`--- ${key} ---\n${text}`)
    }
  }
  return chunks.join('\n')
}

export async function waitforlogsubstring(
  page: import('@playwright/test').Page,
  consolelines: string[],
  needle: string | RegExp,
  budgetms = PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  label = 'log-substring',
): Promise<string> {
  const match = (line: string) =>
    typeof needle === 'string' ? line.includes(needle) : needle.test(line)
  return polluntil(
    label,
    budgetms,
    WANIX_VALIDATE_POLL_MS,
    async () => {
      const tapelogs = await readplaywrightlogs(page).catch(() => [])
      const all = [...consolelines, ...tapelogs]
      for (let i = 0; i < all.length; i++) {
        if (match(all[i])) {
          return all[i]
        }
      }
      return ''
    },
    (line) => line.length > 0,
  )
}

export async function waitfortermorsubstring(
  page: import('@playwright/test').Page,
  root: string,
  consolelines: string[],
  needle: string | RegExp,
  budgetms = PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  label = 'term-or-log',
): Promise<string> {
  const match = (text: string) =>
    typeof needle === 'string' ? text.includes(needle) : needle.test(text)
  return polluntil(
    label,
    budgetms,
    WANIX_VALIDATE_POLL_MS,
    async () => {
      const tapelogs = await readplaywrightlogs(page).catch(() => [])
      for (const line of [...consolelines, ...tapelogs]) {
        if (match(line)) {
          return line
        }
      }
      const term = await readalltermtext(page, root).catch(() => '')
      if (match(term)) {
        return term
      }
      return ''
    },
    (text) => text.length > 0,
  )
}

export async function listwanixtaskids(
  page: import('@playwright/test').Page,
): Promise<string[]> {
  const frame = page.frames().find((f) => f.url().includes('wanix.html'))
  if (!frame) {
    return []
  }
  return frame.evaluate(() => {
    const nodes = document.querySelectorAll('wanix-task[id]')
    const ids: string[] = []
    for (let i = 0; i < nodes.length; i++) {
      const id = nodes[i].getAttribute('id')
      if (id) {
        ids.push(id)
      }
    }
    return ids
  })
}

export async function waitfornewwanixtaskid(
  page: import('@playwright/test').Page,
  known: Set<string>,
  budgetms = PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
): Promise<string> {
  return withscripttimeout('new-wanix-task', budgetms, async () => {
    for (;;) {
      const ids = await listwanixtaskids(page)
      for (let i = 0; i < ids.length; i++) {
        if (!known.has(ids[i]) && ids[i] !== 'zedcafe') {
          return ids[i]
        }
      }
      await page.waitForTimeout(50)
    }
  })
}

export async function readroommountkey(
  page: import('@playwright/test').Page,
  root: string,
): Promise<number> {
  return page.evaluate(async (projectroot) => {
    const { readwanixroomconfig } = await import(
      `/@fs${projectroot}/zss/device/wanixclient/wanixroom.ts`
    )
    return readwanixroomconfig().mountkey
  }, root)
}

export async function hardstopwanixroominpage(
  page: import('@playwright/test').Page,
  root: string,
): Promise<void> {
  await page.evaluate(async (projectroot) => {
    const { stopwanixroom } = await import(
      `/@fs${projectroot}/zss/device/wanixclient/wanixroom.ts`
    )
    stopwanixroom(true)
  }, root)
}
