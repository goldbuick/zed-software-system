import { apilog, wanixserverreadfile } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/types'
import type { WanixTermTileBuffer } from 'zss/device/wanixclient/state'
import {
  readwanixroomconfig,
  spawntaskinroom,
} from 'zss/device/wanixclient/wanixroom'
import { dumpwanixtermbuffertext } from 'zss/device/wanixclient/wanixtermtext'
import {
  WANIX_ZEDCAFE_GUEST_MOUNT,
  WANIX_ZEDSYNC_READY_FILE,
  WANIX_ZEDSYNC_READY_TIMEOUT_MS,
  WANIX_ZEDSYNC_TASK_ID,
} from 'zss/feature/wanix/wanixzedcafeconstants'

export const WANIX_ZEDSYNC_WASM_URL =
  '/wanix/zedsync.wasm?v=ascii-logs-20260718'
export const WANIX_ZEDSYNC_TASK_WASM = `${WANIX_ZEDSYNC_TASK_ID}.wasm`
export const WANIX_ZEDSYNC_READY_NAME = WANIX_ZEDSYNC_READY_FILE
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

function clearreadywait() {
  if (pendingready?.timer) {
    clearInterval(pendingready.timer)
  }
  pendingready = null
}

/** Cancel seed wait (e.g. session closed mid-seed). Import poll never paused. */
export function cancelzedsyncreadywait(reason?: string): void {
  if (!pendingready) {
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
  clearreadywait()
}

/** True while parent is polling for `.zedsync/ready`. */
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
      `zedsync: watching ${path.replace(/\/\.zedsync\/ready$/, '')}`,
    )
    clearreadywait()
  }
}

function tickreadywait() {
  if (!pendingready) {
    return
  }
  if (Date.now() > pendingready.deadline) {
    const { device, player, path } = pendingready
    apilog(device, player, `zedsync: timed out waiting for ${path}`)
    clearreadywait()
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

/**
 * Start host poll for `<target>/.zedsync/ready`. Must run on cafe main
 * (wanixclient readfile replies land here, not in the sim worker). Does
 * NOT pause the zedcafe import poll -- seeding runs alongside it; see
 * `iszedsyncreadywaitpending` for the soft gate other code checks to avoid
 * racing the seed writer (e.g. orphan prune in wanixzedcafe.ts).
 */
export function beginzedsyncreadywait(
  device: DEVICELIKE,
  player: string,
  targetpath: string,
): void {
  const target = targetpath.trim().replace(/^\/+/, '')
  if (!target) {
    return
  }
  clearreadywait()
  pendingready = {
    path: `${target}/${WANIX_ZEDSYNC_READY_NAME}`,
    device,
    player,
    deadline: Date.now() + WANIX_ZEDSYNC_READY_TIMEOUT_MS,
    mirroredguestlines: new Set(),
  }
  apilog(device, player, `zedsync: spawned; waiting for ${pendingready.path}`)
  pendingready.timer = setInterval(tickreadywait, WANIX_ZEDSYNC_READY_POLL_MS)
  tickreadywait()
}

/**
 * Emit iframe spawntask only. Ready-wait starts on main when spawn succeeds
 * (see applywanixtaskspawnresult) -- sim cannot own pendingready.
 */
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

  // Do not call ensurewanixtaskroom here: #wanix zedsync runs in the sim
  // worker, whose roomconfig lags main and often stays idle. ensure on idle
  // hard-remounts and wipes ephemeral FSA binds. Room standup belongs on main
  // (folder drop / #wanix vm / remote connect). Peer presence is checked in
  // the iframe spawntask before gojs starts.

  if (
    readwanixroomconfig().tasks.some(
      (task) => task.id === WANIX_ZEDSYNC_TASK_ID,
    )
  ) {
    const { halttaskinroom } = await import('zss/device/wanixclient/wanixroom')
    halttaskinroom(WANIX_ZEDSYNC_TASK_ID)
  }

  const cmd = `${WANIX_ZEDSYNC_TASK_WASM} ${target}`
  apilog(device, player, 'zedsync: spawning guest; seed in progress...')
  // URL file-bind inside iframe (zedcafe pattern) -- not #ramfs writeFile.
  spawntaskinroom(WANIX_ZEDSYNC_TASK_ID, cmd, 'gojs', WANIX_ZEDSYNC_WASM_URL)
}
