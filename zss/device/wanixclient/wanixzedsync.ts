import { apilog, wanixserverreadfile } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/types'
import type { WanixTermTileBuffer } from 'zss/device/wanixclient/state'
import {
  ensurewanixtaskroom,
  putwanixroomfile,
  readwanixremotes,
  readwanixroomconfig,
  spawntaskinroom,
} from 'zss/device/wanixclient/wanixroom'
import { dumpwanixtermbuffertext } from 'zss/device/wanixclient/wanixtermtext'
import {
  iswanixspaceactive,
  startzedcafepoll,
  stopzedcafepoll,
} from 'zss/device/wanixclient/wanixzedcafe'
import {
  WANIX_ZEDCAFE_GUEST_MOUNT,
  WANIX_ZEDSYNC_TASK_ID,
} from 'zss/feature/wanix/wanixzedcafeconstants'

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
  mirroredguestlines: Set<string>
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
export function cancelzedsyncreadywait(reason?: string): void {
  if (!pendingready) {
    pollwasactive = false
    return
  }
  const { device, player, path } = pendingready
  if (reason) {
    apilog(
      device,
      player,
      `zedsync: seed wait cancelled (${reason}) before ${path}`,
    )
  }
  resumepollandclear(device, player)
}

/** True while parent is polling for `.zedsync-ready`. */
export function iszedsyncreadywaitpending(): boolean {
  return pendingready !== null
}

/**
 * Mirror guest zedsync:* stdout into the host wanix log while seed wait is
 * pending (so WaitExportRoot / WaitDirExists / seed failures show without
 * attaching to the task tile).
 */
export function mirrorzedsynctermlines(
  sessionkey: string,
  buffer: WanixTermTileBuffer,
): void {
  if (!pendingready || !iszedsynctaskid(sessionkey)) {
    return
  }
  const text = dumpwanixtermbuffertext(buffer, { includescrollback: true })
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('zedsync:')) {
      continue
    }
    if (pendingready.mirroredguestlines.has(trimmed)) {
      continue
    }
    pendingready.mirroredguestlines.add(trimmed)
    apilog(pendingready.device, pendingready.player, trimmed)
  }
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
    apilog(
      device,
      player,
      `zedsync: watching ${path.replace(/\/\.zedsync-ready$/, '')}`,
    )
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

  const remotes = readwanixremotes()
  const matched = remotes.find((remote) => remote.dst === target)
  if (!matched) {
    throw new Error(
      `zedsync: no remote mount for "${target}" — run #wanix remote connect <wss-url> ${target} first`,
    )
  }
  if (!iswanixspaceactive()) {
    throw new Error(
      `zedsync: remote mount missing — reconnect ${matched.url} (room idle after failed import)`,
    )
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
  apilog(
    device,
    player,
    `zedsync: spawned; waiting for ${target}/${WANIX_ZEDSYNC_READY_NAME}`,
  )

  clearreadywait()
  pendingready = {
    path: `${target}/${WANIX_ZEDSYNC_READY_NAME}`,
    device,
    player,
    deadline: Date.now() + WANIX_ZEDSYNC_READY_TIMEOUT_MS,
    mirroredguestlines: new Set(),
  }
  pendingready.timer = setInterval(tickreadywait, WANIX_ZEDSYNC_READY_POLL_MS)
  tickreadywait()
}
