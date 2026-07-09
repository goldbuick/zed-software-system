import { readFileSync } from 'node:fs'
import path from 'node:path'

import { WANIX_PUBLIC_FIXTURES_DIR } from 'ops/lib/fixturepaths'
import {
  PLAYWRIGHT_SCENARIO_TIMEOUT_MS,
  withscripttimeout,
} from 'tasks/lib/parity/parity-timeouts'
import type { HeadedPlaywrightScript } from 'tasks/lib/playwright/runheadedscript'
import {
  WANIX_ZEDCAFE_VM_SESSION,
  callwanixrpcinpage,
  callwanixtermwriteinpage,
  collectexportconsoleerrors,
  failzedcafegate,
  polluntil,
  readplaywrightlogs,
  readtermbuffertext,
  sendwanixcli,
  waitwanixrpcping,
  type ZedcafeTimelineEntry,
} from 'tasks/lib/wanix/playwrightzedcafe'
import { waitforregistersession } from 'tasks/lib/wanix/playwrightwaits'
import { WANIX_ZEDCAFE_EXPORT_READY_POLL_MS } from 'zss/feature/wanix/wanixzedcafeconstants'

const VALIDATE_TIMEOUT_MS = PLAYWRIGHT_SCENARIO_TIMEOUT_MS
const EXPORT_POLL_MS = WANIX_ZEDCAFE_EXPORT_READY_POLL_MS
const EXPORT_BUDGET_MS = 90_000

async function dropwanixwasm(
  page: import('@playwright/test').Page,
  root: string,
  fixturepath: string,
  filename: string,
) {
  const bytes = readFileSync(fixturepath)
  await page.evaluate(
    async ({ projectroot, filebytes, label }) => {
      const { emitwanixdropfile } = await import(
        `/@fs${projectroot}/zss/feature/wanix/wanixdropparse.ts`
      )
      const { register, registerreadplayer } = await import(
        `/@fs${projectroot}/zss/device/register.ts`
      )
      const file = new File([new Uint8Array(filebytes)], label, {
        type: 'application/wasm',
      })
      emitwanixdropfile(register, registerreadplayer(), file)
    },
    { projectroot: root, filebytes: Array.from(bytes), label: filename },
  )
}

const validatezedcafevmexport: HeadedPlaywrightScript = async ({
  page,
  baseurl,
  root,
}) => {
  const start = Date.now()
  const timeline: ZedcafeTimelineEntry[] = []
  const consolelines: string[] = []
  const pagelogs: string[] = []

  const record = (label: string, extra?: Record<string, unknown>) => {
    timeline.push({ ms: Date.now() - start, label, extra })
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
    const line = `[${msg.type()}] ${msg.text()}`
    consolelines.push(line)
    pagelogs.push(line)
    if (msg.text().includes('[wanix] idle') || msg.text().includes('[wanix] ready')) {
      wanixbooted = true
    }
  })

  const fail = (
    gate: string,
    taskrid: string | null,
    rpc: Record<string, unknown>,
    termdump = '',
  ): never => {
    const { readdirerrors, walkbookserrors } =
      collectexportconsoleerrors(consolelines)
    return failzedcafegate(gate, {
      timeline,
      taskrid,
      rpc,
      readdirerrors,
      walkbookserrors,
      termdump,
      recentlogs: pagelogs.slice(-80),
    })
  }

  await page.goto(baseurl, {
    waitUntil: 'load',
    timeout: VALIDATE_TIMEOUT_MS,
  })
  record('page-loaded')

  await withscripttimeout('wanix-boot', VALIDATE_TIMEOUT_MS, async () => {
    while (!wanixbooted) {
      const rpcready = await page
        .evaluate(
          () =>
            typeof (globalThis as { callwanixrpc?: unknown }).callwanixrpc ===
            'function',
        )
        .catch(() => false)
      if (rpcready) {
        wanixbooted = true
        break
      }
      await page.waitForTimeout(EXPORT_POLL_MS)
    }
  })
  record('wanix-boot')

  await waitforregistersession(page, root)
  record('register-session')

  await waitwanixrpcping(page, VALIDATE_TIMEOUT_MS)
  record('wanix-rpc-ping')

  const exportlive = await polluntil(
    'task-export-live',
    EXPORT_BUDGET_MS,
    EXPORT_POLL_MS,
    async () => {
      const taskrid = await callwanixrpcinpage<string | null>(
        page,
        'readzedcafetaskrid',
        [],
        10_000,
      )
      if (!taskrid) {
        return { taskrid: null as string | null, live: false }
      }
      const live = await callwanixrpcinpage<boolean>(
        page,
        'iszedcafeexportlive',
        [taskrid],
        10_000,
      )
      return { taskrid, live: !!live }
    },
    (snap) => snap.live === true && !!snap.taskrid,
  )
  record('task-export-live', exportlive)

  const taskrid = exportlive.taskrid
  if (!taskrid || !exportlive.live) {
    fail('export-live', taskrid, { exportlive })
  }

  const postliveconsolestart = consolelines.length

  const exportdir = await callwanixrpcinpage<string[]>(
    page,
    'listdir',
    [`#task/${taskrid}/export`],
    10_000,
  ).catch((err: Error) => ({ error: err.message }))
  const readdirprobe = collectexportconsoleerrors(
    consolelines.slice(postliveconsolestart),
  )
  if (readdirprobe.readdirerrors.length > 0) {
    fail('export-readdir', taskrid, { exportdir, ...readdirprobe })
  }
  if (
    !Array.isArray(exportdir) ||
    !exportdir.some((entry) => entry.replace(/\/$/, '') === 'stats.json')
  ) {
    fail('export-stats', taskrid, { exportdir })
  }
  record('task-export-stats', { exportdir })

  await sendwanixcli(page, root, '#wanix vm')

  const vmstatus = await polluntil(
    'wanix-vm-started',
    VALIDATE_TIMEOUT_MS,
    EXPORT_POLL_MS,
    async () =>
      callwanixrpcinpage<{
        running?: boolean
        vrid?: string | null
      }>(page, 'readvmstatus', [], 10_000),
    (status) => !!status?.vrid,
  )
  record('wanix-vm-started', vmstatus)

  if (!vmstatus?.vrid) {
    const logs = await readplaywrightlogs(page)
    fail('wanix-vm-started', taskrid, { vmstatus, logs })
  }

  let guestbound = false
  let lastdiag: Record<string, unknown> = {}
  const guestdeadline = Date.now() + EXPORT_BUDGET_MS
  while (Date.now() < guestdeadline) {
    const rid = await callwanixrpcinpage<string | null>(
      page,
      'readzedcafetaskrid',
      [],
      10_000,
    )
    const live = rid
      ? await callwanixrpcinpage<boolean>(
          page,
          'iszedcafeexportlive',
          [rid],
          10_000,
        )
      : false
    guestbound = await callwanixrpcinpage<boolean>(
      page,
      'iszedcafeguestbound',
      [],
      10_000,
    )
    lastdiag = { guestbound, rid, live, vmstatus }
    if (guestbound) {
      break
    }
    if (rid && live) {
      await callwanixrpcinpage<{ ok: boolean; count?: number }>(
        page,
        'wirezedcafeexport',
        [rid],
        30_000,
      ).catch((err: Error) => ({ error: err.message }))
    }
    await page.waitForTimeout(EXPORT_POLL_MS)
  }
  record('vm-guest-bound', lastdiag)

  if (!guestbound) {
    fail('guestbound', taskrid, lastdiag)
  }

  await sendwanixcli(page, root, `#wanix attach ${WANIX_ZEDCAFE_VM_SESSION}`)
  await page.waitForTimeout(500)
  record('vm-attached')

  await polluntil(
    'vm-shell-prompt',
    EXPORT_BUDGET_MS,
    EXPORT_POLL_MS,
    async () => readtermbuffertext(page, root, WANIX_ZEDCAFE_VM_SESSION),
    (text) => /~\s*#|#\s/.test(text),
  )

  await callwanixtermwriteinpage(
    page,
    root,
    'zedcafe-stats\n',
    WANIX_ZEDCAFE_VM_SESSION,
  )

  let termdump = ''
  const statstext = await polluntil(
    'vm-term-zedcafe-stats',
    EXPORT_BUDGET_MS,
    EXPORT_POLL_MS,
    async () => {
      termdump = await readtermbuffertext(page, root, WANIX_ZEDCAFE_VM_SESSION)
      return termdump
    },
    (text) => /bookCount|"exportedAt"/.test(text),
  )
  record('vm-term-zedcafe-stats')

  if (!/bookCount|"exportedAt"/.test(statstext)) {
    fail('vm-term-zedcafe', taskrid, { statstext: statstext.slice(-500) }, termdump)
  }

  await callwanixtermwriteinpage(
    page,
    root,
    'ls /zedcafe\n',
    WANIX_ZEDCAFE_VM_SESSION,
  )

  termdump = await polluntil(
    'vm-term-ls-zedcafe',
    EXPORT_BUDGET_MS,
    EXPORT_POLL_MS,
    async () => readtermbuffertext(page, root, WANIX_ZEDCAFE_VM_SESSION),
    (text) => /stats\.json/.test(text) && /books/.test(text),
  )
  record('vm-term-ls-zedcafe')

  if (!/stats\.json/.test(termdump) || !/books/.test(termdump)) {
    fail('vm-term-ls-zedcafe', taskrid, { statstext: statstext.slice(-500) }, termdump)
  }

  const fixturepath = path.join(WANIX_PUBLIC_FIXTURES_DIR, 'findplayers.wasm')
  await dropwanixwasm(page, root, fixturepath, 'findplayers.wasm')
  record('findplayers-drop')

  await withscripttimeout('findplayers-run', VALIDATE_TIMEOUT_MS, async () => {
    for (;;) {
      const logs = await readplaywrightlogs(page)
      if (logs.some((line) => /findplayers|"players"/.test(line))) {
        break
      }
      await page.waitForTimeout(EXPORT_POLL_MS)
    }
  })
  record('findplayers-run')

  const walkprobe = collectexportconsoleerrors(consolelines)
  if (walkprobe.walkbookserrors.length > 0) {
    fail('findplayers-walk', taskrid, { walkprobe }, termdump)
  }

  record('pass')
}

export default validatezedcafevmexport
