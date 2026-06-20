import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { parsewanixwasm } from 'zss/feature/wanix/wanixdrop'
import {
  haltwanixvm,
  iswanixspaceactive,
  readwanixhostattachedserial,
  readwanixhoststate,
  readwanixstatus,
  readwanixvmpreperror,
  readwanixvmprepstage,
  sendwanixvmline,
  spawnwanixvm,
  spawnwanixvmspace,
  type WANIX_VM_PREP_STAGE,
} from 'zss/feature/wanix/wanixhost'
import {
  readwanixvmasseturls,
  DEFAULT_WANIX_VM_ID,
  type WANIX_VM_ASSET_URLS,
} from 'zss/feature/wanix/wanixvmassets'
import { useTape } from 'zss/gadget/data/state'
import { createhellowasmfile } from 'zss/testsupport/wanix/hellowasm'

export type WANIX_SMOKE_REPORT = {
  logs: string[]
  sawsandbox: boolean
  sawruncmd: boolean
  sawhello: boolean
  sawexit: boolean
  sawerror: boolean
  sawtermattached: boolean
  hoststate: string
  hostpresent: boolean
  errormessage?: string
}

export type WANIX_VM_SMOKE_REPORT = {
  stage: WANIX_VM_PREP_STAGE
  prepok: boolean
  spawnok: boolean
  serialok: boolean
  tileattached: boolean
  logs: string[]
  serial: string
  preperror?: string
  errormessage?: string
}

function logslicefrom(start: number): string[] {
  const logs = useTape.getState().terminal.logs ?? []
  const added = logs.length - start
  if (added <= 0) {
    return []
  }
  return logs.slice(0, added).map((line) => String(line))
}

function buildreport(logs: string[]): WANIX_SMOKE_REPORT {
  const joined = logs.join('\n')
  const serial = readwanixhostattachedserial()
  const mount = document.getElementById('zss-wanix-display')
  return {
    logs,
    sawsandbox: iswanixspaceactive(),
    sawruncmd: /wanix run hello-wasm/.test(joined),
    sawhello:
      joined.includes('Hello from wanix!') ||
      serial.includes('Hello from wanix!'),
    sawexit: /wanix exit hello-wasm \d+/.test(joined),
    sawtermattached: useTape.getState().terminalmode === 'attached',
    sawerror:
      joined.includes('wanix>>') || joined.includes('task output timeout'),
    hoststate: readwanixhoststate(),
    hostpresent: !!mount?.querySelector('wanix-system'),
  }
}

function buildvmreport(logs: string[]): WANIX_VM_SMOKE_REPORT {
  const stage = readwanixvmprepstage()
  const serial = readwanixhostattachedserial()
  const joined = logs.join('\n')
  return {
    stage,
    prepok: stage === 'mount_ok' || stage === 'spawn' || stage === 'serial',
    spawnok:
      stage === 'spawn' ||
      stage === 'serial' ||
      /wanix vm boot /.test(joined),
    serialok: serial.length > 0 || stage === 'serial',
    tileattached: useTape.getState().terminalmode === 'attached',
    logs,
    serial,
    preperror: readwanixvmpreperror(),
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function drophellowasm(player: string) {
  await parsewanixwasm(player, createhellowasmfile())
}

/** Drop hello.wasm (auto-start sandbox) and collect terminal evidence. */
export async function runwanixsmoke(
  deadlinems = 90_000,
): Promise<WANIX_SMOKE_REPORT> {
  const player = registerreadplayer()
  const logstart = (useTape.getState().terminal.logs ?? []).length

  try {
    await drophellowasm(player)
  } catch (err) {
    const logs = logslicefrom(logstart)
    const report = buildreport(logs)
    report.errormessage = err instanceof Error ? err.message : String(err)
    return report
  }

  const started = Date.now()
  while (Date.now() - started < deadlinems) {
    const logs = logslicefrom(logstart)
    const report = buildreport(logs)
    if (report.sawhello && report.sawexit) {
      return report
    }
    if (report.sawerror) {
      report.errormessage = 'wanix apierror in scrollback'
      return report
    }
    await sleep(250)
  }

  const logs = logslicefrom(logstart)
  const report = buildreport(logs)
  report.errormessage = `deadline ${deadlinems}ms — logs:\n${logs.slice(-12).join('\n')}`
  return report
}

/**
 * Prep + spawn + wait for serial/tile — mirrors `#wanix vm` success criteria.
 * Default deadline covers CDN archive fetch + v86 boot.
 */
export async function runwanixvmsmoke(
  deadlinems = 600_000,
): Promise<WANIX_VM_SMOKE_REPORT> {
  const player = registerreadplayer()
  const logstart = (useTape.getState().terminal.logs ?? []).length

  try {
    await spawnwanixvmspace(SOFTWARE, player)
    const status = await readwanixstatus()
    if (!status.vmbindsready) {
      throw new Error('vm prep finished without vmbindsready')
    }
    await spawnwanixvm({
      vmid: 'linux-vm-smoke',
      attach: true,
      wait: false,
    })
  } catch (err) {
    const logs = logslicefrom(logstart)
    const report = buildvmreport(logs)
    report.errormessage = err instanceof Error ? err.message : String(err)
    return report
  }

  const started = Date.now()
  while (Date.now() - started < deadlinems) {
    const logs = logslicefrom(logstart)
    const report = buildvmreport(logs)
    if (report.serialok && report.tileattached) {
      return report
    }
    if (report.stage === 'failed' || report.preperror) {
      report.errormessage = report.preperror ?? 'vm prep failed'
      return report
    }
    if (logs.some((line) => line.includes('wanix>>'))) {
      report.errormessage = 'wanix apierror in scrollback'
      return report
    }
    await sleep(500)
  }

  const logs = logslicefrom(logstart)
  const report = buildvmreport(logs)
  report.errormessage = `deadline ${deadlinems}ms stage=${report.stage} serial=${report.serial.length}`
  return report
}

export type WANIX_VM_TERM_STRESS_REPORT = {
  ok: boolean
  stage: WANIX_VM_PREP_STAGE
  sawprompt: boolean
  sawunamehelp: boolean
  sawid: boolean
  haswanixtermel: boolean
  tileattached: boolean
  serial: string
  errormessage?: string
}

function haswanixvmprompt(serial: string) {
  return serial.includes('~ #') || serial.includes('login:')
}

/**
 * Full `#wanix vm` term path: spawn, `uname --help`, then `id` via sendwanixvmline.
 * Pair with Playwright panic collector on the full ZSS app (`/?ZSS_E2E=1`).
 */
export async function runwanixvmtermstress(
  urls: WANIX_VM_ASSET_URLS = readwanixvmasseturls(),
  deadlinems = 600_000,
): Promise<WANIX_VM_TERM_STRESS_REPORT> {
  const player = registerreadplayer()
  const vmid = DEFAULT_WANIX_VM_ID
  const fail = (
    partial: Partial<WANIX_VM_TERM_STRESS_REPORT> & { errormessage: string },
  ): WANIX_VM_TERM_STRESS_REPORT => ({
    ok: false,
    stage: readwanixvmprepstage(),
    sawprompt: false,
    sawunamehelp: false,
    sawid: false,
    haswanixtermel: !!document.querySelector(
      '#zss-wanix-term-iframe, wanix-term',
    ),
    tileattached: useTape.getState().terminalmode === 'attached',
    serial: readwanixhostattachedserial(),
    ...partial,
  })

  try {
    await spawnwanixvmspace(SOFTWARE, player, urls)
    const status = await readwanixstatus()
    if (!status.vmbindsready) {
      throw new Error('vm prep finished without vmbindsready')
    }
    await spawnwanixvm({ vmid, attach: true, wait: false })
  } catch (err) {
    return fail({
      errormessage: err instanceof Error ? err.message : String(err),
    })
  }

  let serial = readwanixhostattachedserial()
  const bootdeadline = Date.now() + Math.min(deadlinems, 300_000)
  while (Date.now() < bootdeadline) {
    serial = readwanixhostattachedserial()
    if (haswanixvmprompt(serial)) {
      break
    }
    if (readwanixvmprepstage() === 'failed' || readwanixvmpreperror()) {
      return fail({
        sawprompt: false,
        errormessage: readwanixvmpreperror() ?? 'vm prep failed',
      })
    }
    await sleep(500)
  }

  const sawprompt = haswanixvmprompt(serial)
  if (!sawprompt) {
    await haltwanixvm(vmid).catch(() => {})
    return fail({
      sawprompt: false,
      errormessage: `boot prompt not seen (serial len=${serial.length})`,
    })
  }

  await sleep(2000)

  try {
    await sendwanixvmline('uname --help')
  } catch (err) {
    await haltwanixvm(vmid).catch(() => {})
    return fail({
      sawprompt: true,
      errormessage: `uname --help write: ${err instanceof Error ? err.message : String(err)}`,
    })
  }

  const unamedeadline = Date.now() + 60_000
  while (Date.now() < unamedeadline) {
    serial = readwanixhostattachedserial()
    if (serial.includes('BusyBox') && serial.includes('Usage:')) {
      break
    }
    await sleep(300)
  }

  const sawunamehelp = serial.includes('Usage:')
  if (!sawunamehelp) {
    await haltwanixvm(vmid).catch(() => {})
    return fail({
      sawprompt: true,
      sawunamehelp: false,
      errormessage: 'uname --help output not seen in serial buffer',
    })
  }

  await sleep(1500)

  try {
    await sendwanixvmline('id')
  } catch (err) {
    await haltwanixvm(vmid).catch(() => {})
    return fail({
      sawprompt: true,
      sawunamehelp: true,
      errormessage: `id write: ${err instanceof Error ? err.message : String(err)}`,
    })
  }

  const iddeadline = Date.now() + 30_000
  while (Date.now() < iddeadline) {
    serial = readwanixhostattachedserial()
    if (serial.includes('uid=')) {
      break
    }
    await sleep(200)
  }

  const sawid = serial.includes('uid=')
  const haswanixtermel = !!document.querySelector(
    '#zss-wanix-term-iframe, wanix-term',
  )
  await haltwanixvm(vmid).catch(() => {})

  return {
    ok: sawprompt && sawunamehelp && sawid,
    stage: readwanixvmprepstage(),
    sawprompt,
    sawunamehelp,
    sawid,
    haswanixtermel,
    tileattached: useTape.getState().terminalmode === 'attached',
    serial,
    errormessage: sawid ? undefined : 'id output not seen in serial buffer',
  }
}

export function readwanixdiag(): Pick<
  WANIX_SMOKE_REPORT,
  'hoststate' | 'hostpresent'
> & {
  vmprepstage: WANIX_VM_PREP_STAGE
  vmpreperror?: string
} {
  const mount = document.getElementById('zss-wanix-display')
  return {
    hoststate: readwanixhoststate(),
    hostpresent: !!mount?.querySelector('wanix-system'),
    vmprepstage: readwanixvmprepstage(),
    vmpreperror: readwanixvmpreperror(),
  }
}
