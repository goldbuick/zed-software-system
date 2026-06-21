import { SOFTWARE } from 'zss/device/session'
import {
  haltwanixvm,
  readwanixhostattachedserial,
  readwanixhoststate,
  readwanixstatus,
  readwanixvmpreperror,
  readwanixvmprepstage,
  refreshwanixhostattachedserial,
  sendwanixvmline,
  spawnwanixvm,
  spawnwanixvmspace,
  waitwanixhostvmprompt,
  type WANIX_VM_PREP_STAGE,
} from 'zss/feature/wanix/wanixhost'
import {
  readwanixvmasseturls,
  DEFAULT_WANIX_VM_ID,
  type WANIX_VM_ASSET_URLS,
} from 'zss/feature/wanix/wanixvmassets'
import { useTape } from 'zss/gadget/data/state'

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
  return /login:/i.test(serial) || /~\s#/.test(serial)
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * Full `#wanix vm` term path: spawn, `uname --help`, then `id` via sendwanixvmline.
 * Browser-safe — no register, wanixdrop, or node fixture imports.
 */
export async function runwanixvmtermstress(
  player: string,
  urls: WANIX_VM_ASSET_URLS = readwanixvmasseturls(),
  deadlinems = 600_000,
): Promise<WANIX_VM_TERM_STRESS_REPORT> {
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
  const bootwaitms = Math.min(deadlinems, 300_000)
  try {
    await waitwanixhostvmprompt(bootwaitms)
  } catch (err) {
    if (readwanixvmprepstage() === 'failed' || readwanixvmpreperror()) {
      return fail({
        sawprompt: false,
        errormessage: readwanixvmpreperror() ?? 'vm prep failed',
      })
    }
    serial = readwanixhostattachedserial()
    await haltwanixvm(vmid).catch(() => {})
    return fail({
      sawprompt: false,
      errormessage:
        err instanceof Error
          ? err.message
          : `boot prompt not seen (serial len=${serial.length})`,
    })
  }

  await refreshwanixhostattachedserial()
  serial = readwanixhostattachedserial()
  const sawprompt = haswanixvmprompt(serial)
  if (!sawprompt) {
    await haltwanixvm(vmid).catch(() => {})
    return fail({
      sawprompt: false,
      errormessage: `boot prompt not seen (serial len=${serial.length}, tail=${JSON.stringify(serial.slice(-120))})`,
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
    await refreshwanixhostattachedserial()
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
    await refreshwanixhostattachedserial()
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

export function readwanixdiag(): {
  hoststate: string
  hostpresent: boolean
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
