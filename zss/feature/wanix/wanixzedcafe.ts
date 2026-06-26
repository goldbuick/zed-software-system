import type { DEVICELIKE } from 'zss/device/api'
import { apilog, wanixrequestzedcafeexport } from 'zss/device/api'
import { iswanixspaceactive, putwanixfile } from 'zss/feature/wanix/wanixhost'
import type { WANIX_ZED_CAFE_EXPORT_FILE } from 'zss/feature/wanix/wanixstateexport'
import {
  iframechildhaltzedcafe,
  iframechildsetzedcafeready,
  iframechildsynczedcafe,
  iframechildwaitzedcafeready,
} from 'zss/feature/wanix/wanixtermiframehost'
import {
  WANIX_ZED_CAFE_INBOX_RAMFS,
  WANIX_ZED_CAFE_WASM_CMD,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import {
  iswanixzedcafetask,
  readwanixzedcaferestart,
  setwanixzedcafeready,
  setwanixzedcaferestart,
} from 'zss/feature/wanix/wanixzedcafesession'

let pendingexport = false

const encoder = new TextEncoder()

function bytestobase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; ++i) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function encodeinboxjson(files: WANIX_ZED_CAFE_EXPORT_FILE[]): Uint8Array {
  const payload = {
    files: files.map((file) => ({
      path: file.path,
      data: bytestobase64(file.bytes),
    })),
  }
  return encoder.encode(`${JSON.stringify(payload)}\n`)
}

function yieldframe(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

export function markwanixzedcafependingexport() {
  pendingexport = true
}

export function readwanixzedcafependingexport(): boolean {
  return pendingexport
}

export function clearwanixzedcafependingexport() {
  pendingexport = false
}

async function writzedcafeinbox(files: WANIX_ZED_CAFE_EXPORT_FILE[]) {
  await putwanixfile(
    WANIX_ZED_CAFE_INBOX_RAMFS,
    encodeinboxjson(files),
  )
}

export async function ensurewanixzedcafedaemon(
  device: DEVICELIKE,
  player: string,
): Promise<boolean> {
  const restart = readwanixzedcaferestart() + 1
  setwanixzedcaferestart(restart)
  await iframechildsynczedcafe(WANIX_ZED_CAFE_WASM_CMD, restart)
  await yieldframe()
  const taskrid = await iframechildwaitzedcafeready()
  if (taskrid) {
    setwanixzedcafeready(true)
    await iframechildsetzedcafeready(true)
    return true
  }
  apilog(
    device,
    player,
    'zed-cafe export: gojs export timed out — check apilog for gojs task or export bind errors',
  )
  return false
}

export async function wanixhandleexportstate(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
) {
  if (!iswanixspaceactive()) {
    markwanixzedcafependingexport()
    return
  }
  clearwanixzedcafependingexport()
  if (readwanixzedcaferestart() > 0) {
    await iframechildhaltzedcafe()
  }
  await writzedcafeinbox(files)
  await ensurewanixzedcafedaemon(device, player)
}

export async function wanixdrainpendingzedcafeexport(
  device: DEVICELIKE,
  player: string,
) {
  if (!readwanixzedcafependingexport()) {
    return
  }
  wanixrequestzedcafeexport(device, player)
}

/** Test hook — reset pending flag. */
export function resetwanixzedcafefortest() {
  pendingexport = false
}

export { iswanixzedcafetask }
