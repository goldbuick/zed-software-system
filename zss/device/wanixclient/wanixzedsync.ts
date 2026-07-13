import { apilog, wanixserverreadfile } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/types'
import {
  ensurewanixtaskroom,
  putwanixroomfile,
  readwanixroomconfig,
  spawntaskinroom,
} from 'zss/device/wanixclient/wanixroom'
import {
  startzedcafepoll,
  stopzedcafepoll,
} from 'zss/device/wanixclient/wanixzedcafe'
import { WANIX_ZEDCAFE_GUEST_MOUNT } from 'zss/feature/wanix/wanixzedcafeconstants'

export const WANIX_ZEDSYNC_TASK_ID = 'zedsync'
export const WANIX_ZEDSYNC_WASM_URL = '/wanix/zedsync.wasm'
export const WANIX_ZEDSYNC_READY_NAME = '.zedsync-ready'
const WANIX_ZEDSYNC_READY_TIMEOUT_MS = 60_000
const WANIX_ZEDSYNC_READY_POLL_MS = 500

type ZedsyncReadyWait = {
  path: string
  device: DEVICELIKE
  player: string
  deadline: number
  timer?: ReturnType<typeof setInterval>
}

let pendingready: ZedsyncReadyWait | null = null
let pollwasactive = false

function clearreadywait() {
  if (pendingready?.timer) {
    clearInterval(pendingready.timer)
  }
  pendingready = null
}

function resumepollandclear(device: DEVICELIKE, player: string) {
  clearreadywait()
  if (pollwasactive) {
    startzedcafepoll(device, player)
  }
  pollwasactive = false
}

/** Cancel seed wait and resume poll (e.g. session closed mid-seed). */
export function cancelzedsyncreadywait(): void {
  if (!pendingready) {
    pollwasactive = false
    return
  }
  const { device, player } = pendingready
  resumepollandclear(device, player)
}

/** Parent handler for wanixclient:readfile while waiting for zedsync seed sentinel. */
export function applyzedsyncreadfileresult(data: unknown): void {
  if (!pendingready) {
    return
  }
  if (
    data &&
    typeof data === 'object' &&
    (data as { ok?: boolean }).ok === false
  ) {
    return
  }
  if (Array.isArray(data)) {
    const { device, player, path } = pendingready
    apilog(device, player, `zedsync: seed ready (${path})`)
    resumepollandclear(device, player)
  }
}

function tickreadywait() {
  if (!pendingready) {
    return
  }
  if (Date.now() > pendingready.deadline) {
    const { device, player, path } = pendingready
    apilog(
      device,
      player,
      `zedsync: timed out waiting for ${path}; resuming poll`,
    )
    resumepollandclear(device, player)
    return
  }
  wanixserverreadfile(
    pendingready.device,
    pendingready.player,
    pendingready.path,
  )
}

export function iszedsynctaskid(sessionkey: string): boolean {
  return (
    sessionkey === WANIX_ZEDSYNC_TASK_ID ||
    sessionkey.startsWith(`${WANIX_ZEDSYNC_TASK_ID}-`)
  )
}

export async function startwanixzedsync(
  device: DEVICELIKE,
  player: string,
  targetpath: string,
): Promise<void> {
  const target = targetpath.trim().replace(/^\/+/, '')
  if (!target) {
    throw new Error('usage: #wanix zedsync <targetpath>')
  }
  if (/\s/.test(target)) {
    throw new Error(
      'zedsync targetpath must not contain spaces (wanix cmd is space-split)',
    )
  }
  if (target === WANIX_ZEDCAFE_GUEST_MOUNT) {
    throw new Error('zedsync targetpath must not be zedcafe')
  }

  ensurewanixtaskroom(device, player)
  pollwasactive = true
  stopzedcafepoll()
  apilog(device, player, 'zedsync: paused import poll for seed')

  const response = await fetch(WANIX_ZEDSYNC_WASM_URL)
  if (!response.ok) {
    resumepollandclear(device, player)
    throw new Error(
      `zedsync: failed to fetch ${WANIX_ZEDSYNC_WASM_URL} (${response.status})`,
    )
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  const ramfspath = `#ramfs/${WANIX_ZEDSYNC_TASK_ID}.wasm`
  putwanixroomfile(ramfspath, bytes)

  if (
    readwanixroomconfig().tasks.some(
      (task) => task.id === WANIX_ZEDSYNC_TASK_ID,
    )
  ) {
    const { halttaskinroom } = await import('zss/device/wanixclient/wanixroom')
    halttaskinroom(WANIX_ZEDSYNC_TASK_ID)
  }

  const cmd = `${ramfspath} ${target}`
  spawntaskinroom(WANIX_ZEDSYNC_TASK_ID, cmd, 'gojs')
  apilog(device, player, `zedsync: started watching ${target}`)

  clearreadywait()
  pendingready = {
    path: `${target}/${WANIX_ZEDSYNC_READY_NAME}`,
    device,
    player,
    deadline: Date.now() + WANIX_ZEDSYNC_READY_TIMEOUT_MS,
  }
  pendingready.timer = setInterval(tickreadywait, WANIX_ZEDSYNC_READY_POLL_MS)
  tickreadywait()
}
