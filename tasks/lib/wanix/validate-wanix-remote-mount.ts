import { writeFileSync } from 'node:fs'

import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import {
  type ZedcafeTimelineEntry,
  collectwanixperf,
  polliswanixready,
  readplaywrightlogs,
  sendwanixcli,
} from 'tasks/lib/wanix/playwrightzedcafe'
import { WANIX_ZEDCAFE_EXPORT_READY_POLL_MS } from 'zss/feature/wanix/wanixzedcafeconstants'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const REPORT_PATH = '/tmp/wanix-remote-mount-report.json'
const DEFAULT_WSS = 'wss://localhost:8765/'
const REMOTE_DST = 'remote'

type MountFailureReport = {
  failedgate: string
  wssurl: string
  timeline: ZedcafeTimelineEntry[]
  perf: ZedcafeTimelineEntry[]
  recentlogs: string[]
  applyerrors: string[]
  remotedir?: string[] | null
  haszedcafetask?: boolean
  extra?: Record<string, unknown>
}

function writemountreport(report: MountFailureReport): void {
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)
}

function collectapplyerrors(lines: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (
      /wanix room apply failed/i.test(line) ||
      /wanix remote mount timeout/i.test(line) ||
      /AwaitErr never called then/i.test(line) ||
      /remote mount timeout/i.test(line) ||
      /remote-import-then-timeout/i.test(line)
    ) {
      out.push(line)
    }
  }
  return out
}

function findperflabel(
  lines: string[],
  label: string,
): { index: number; line: string } | null {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`[wanix-perf] ${label}`)) {
      return { index: i, line: lines[i] }
    }
  }
  return null
}

async function readdirremote(
  page: import('@playwright/test').Page,
  dst: string,
): Promise<string[]> {
  const frame = page.frames().find((f) => f.url().includes('wanix.html'))
  if (!frame) {
    throw new Error('wanix iframe frame not found')
  }
  return frame.evaluate(async (mountdst) => {
    const sys = document.querySelector('wanix-namespace') as
      | (HTMLElement & {
          root?: { readDir: (path: string) => Promise<unknown> }
        })
      | null
    if (!sys?.root?.readDir) {
      throw new Error('wanix-namespace.root.readDir missing')
    }
    const entries = await sys.root.readDir(mountdst)
    // Empty remote mount may return null/undefined; treat as [].
    if (entries == null) {
      return []
    }
    if (Array.isArray(entries)) {
      return entries.map((entry) => String(entry))
    }
    if (typeof entries === 'object' && Symbol.iterator in entries) {
      return [...(entries as Iterable<unknown>)].map((entry) => String(entry))
    }
    throw new Error(`readDir(${mountdst}) unexpected type ${typeof entries}`)
  }, dst)
}

async function haszedcafetask(
  page: import('@playwright/test').Page,
): Promise<boolean> {
  const frame = page.frames().find((f) => f.url().includes('wanix.html'))
  if (!frame) {
    return false
  }
  return frame.evaluate(() => {
    return !!document.querySelector('wanix-task#zedcafe')
  })
}

const validateremotemount: HeadedPlaywrightScript = async ({
  page,
  baseurl,
  root,
}) => {
  const start = Date.now()
  const timeline: ZedcafeTimelineEntry[] = []
  const consolelines: string[] = []
  const wssurl = process.env.WANIX_P9_WSS_URL?.trim() || DEFAULT_WSS

  const record = (label: string, extra?: Record<string, unknown>) => {
    timeline.push({ ms: Date.now() - start, label, extra })
  }

  const fail = (gate: string, extra: Record<string, unknown> = {}): never => {
    const applyerrors = collectapplyerrors(consolelines)
    const perf = collectwanixperf(consolelines, start)
    writemountreport({
      failedgate: gate,
      wssurl,
      timeline,
      perf,
      recentlogs: consolelines.slice(-120),
      applyerrors,
      remotedir: (extra.remotedir as string[] | null | undefined) ?? null,
      haszedcafetask: extra.haszedcafetask as boolean | undefined,
      extra,
    })
    throw new Error(`wanix remote mount validator failed at gate: ${gate}`)
  }

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

  let wanixbooted = false
  page.on('pageerror', (err) => {
    consolelines.push(`[pageerror] ${err.message}`)
  })
  page.on('console', (msg) => {
    const text = msg.text()
    const line = `[${msg.type()}] ${text}`
    consolelines.push(line)
    const perfmatch = /\[wanix-perf\] (\S+)(?: (.+))?$/.exec(text)
    if (perfmatch) {
      let extra: Record<string, unknown> | undefined
      if (perfmatch[2]) {
        try {
          extra = JSON.parse(perfmatch[2]) as Record<string, unknown>
        } catch {
          extra = { raw: perfmatch[2] }
        }
      }
      timeline.push({
        ms: Date.now() - start,
        label: perfmatch[1],
        extra,
      })
    }
    if (text.includes('[wanix] idle') || text.includes('[wanix] ready')) {
      wanixbooted = true
    }
  })

  try {
    await withscripttimeout('page-load', VALIDATE_TIMEOUT_MS, async () => {
      await page.goto(baseurl, {
        waitUntil: 'load',
        timeout: VALIDATE_TIMEOUT_MS,
      })
    })
    record('page-load')

    // Match zedcafe validator: console may not log "[wanix] idle|ready";
    // bridge exports iswanixready once the client module loads.
    await withscripttimeout('wanix-boot', VALIDATE_TIMEOUT_MS, async () => {
      while (!wanixbooted) {
        const ready = await page
          .evaluate(
            () =>
              typeof (globalThis as { iswanixready?: () => boolean })
                .iswanixready === 'function',
          )
          .catch(() => false)
        if (ready) {
          wanixbooted = true
          break
        }
        await page.waitForTimeout(WANIX_ZEDCAFE_EXPORT_READY_POLL_MS)
      }
    })
    record('wanix-boot')

    await waitforregistersession(page, root)
    record('register-session')

    await polliswanixready(page, VALIDATE_TIMEOUT_MS)
    record('wanix-ready')

    const connectcmd = `#wanix remote connect ${wssurl} ${REMOTE_DST}`
    await sendwanixcli(page, root, connectcmd)
    record('remote-connect-sent', { cmd: connectcmd })

    await withscripttimeout(
      'remote-wss-perf-chain',
      VALIDATE_TIMEOUT_MS,
      async () => {
        for (;;) {
          const thenhit = findperflabel(consolelines, 'remote-wss-then')
          const fulfill = findperflabel(
            consolelines,
            'remote-wss-fulfill-allowed',
          )
          const open = findperflabel(consolelines, 'remote-wss-open')
          if (thenhit && fulfill && open) {
            if (
              !(thenhit.index < fulfill.index && fulfill.index < open.index)
            ) {
              fail('perf-order', {
                thenindex: thenhit.index,
                fulfillindex: fulfill.index,
                openindex: open.index,
                thenline: thenhit.line,
                fulfillline: fulfill.line,
                openline: open.line,
              })
            }
            const thenextra = /\{.*\}/.exec(thenhit.line)?.[0]
            let thencount = 0
            if (thenextra) {
              try {
                thencount = Number(
                  (JSON.parse(thenextra) as { thencount?: number }).thencount ??
                    0,
                )
              } catch {
                thencount = 0
              }
            }
            if (thencount < 1) {
              fail('perf-thencount', { thenline: thenhit.line, thencount })
            }
            return
          }
          const earlyfail = collectapplyerrors(consolelines)
          if (earlyfail.length > 0) {
            fail('apply-or-mount-error', { applyerrors: earlyfail })
          }
          await page.waitForTimeout(WANIX_ZEDCAFE_EXPORT_READY_POLL_MS)
        }
      },
    )
    record('remote-wss-perf-ok')

    const applyerrors = collectapplyerrors(consolelines)
    if (applyerrors.length > 0) {
      fail('apply-or-mount-error', { applyerrors })
    }

    let remotedir: string[] = []
    await withscripttimeout('readdir-remote', VALIDATE_TIMEOUT_MS, async () => {
      for (;;) {
        try {
          remotedir = await readdirremote(page, REMOTE_DST)
          return
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (
            /file does not exist/i.test(msg) ||
            /readDir/i.test(msg) ||
            /wanix-namespace/i.test(msg)
          ) {
            const late = collectapplyerrors(consolelines)
            if (late.length > 0) {
              fail('readdir-remote', {
                pollerror: msg,
                applyerrors: late,
              })
            }
            await page.waitForTimeout(WANIX_ZEDCAFE_EXPORT_READY_POLL_MS)
            continue
          }
          fail('readdir-remote', { pollerror: msg })
        }
      }
    })
    record('readdir-remote-ok', { remotedir })

    const zedcafe = await haszedcafetask(page)
    record('zedcafe-task-check', { haszedcafetask: zedcafe })

    const nativelogs = await readplaywrightlogs(page)
    for (let i = 0; i < nativelogs.length; i++) {
      consolelines.push(`[nativelog] ${nativelogs[i]}`)
    }
    const finalerrors = collectapplyerrors(consolelines)
    if (finalerrors.length > 0) {
      fail('post-readdir-errors', {
        applyerrors: finalerrors,
        remotedir,
        haszedcafetask: zedcafe,
      })
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          wssurl,
          remotedir,
          haszedcafetask: zedcafe,
          timeline,
          reportpath: REPORT_PATH,
        },
        null,
        2,
      ),
    )
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes('wanix remote mount validator failed at gate:')
    ) {
      throw err
    }
    writemountreport({
      failedgate: 'uncaught',
      wssurl,
      timeline,
      perf: collectwanixperf(consolelines, start),
      recentlogs: consolelines.slice(-120),
      applyerrors: collectapplyerrors(consolelines),
      extra: {
        error: err instanceof Error ? err.message : String(err),
      },
    })
    throw err
  }
}

export default validateremotemount
