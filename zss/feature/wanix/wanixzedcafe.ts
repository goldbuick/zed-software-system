import type { DEVICELIKE } from 'zss/device/api'
import { apilog, wanixrequestzedcafeexport } from 'zss/device/api'
import { iswanixspaceactive, putwanixfile } from 'zss/feature/wanix/wanixhost'
import { haswanixvms } from 'zss/feature/wanix/wanixsession'
import { validatezedcafeexportpaths } from 'zss/feature/wanix/zedcafetreeschema'
import type { WANIX_ZED_CAFE_EXPORT_FILE } from 'zss/feature/wanix/wanixstateexport'
import type { WanixZedCafeGuestFile } from 'zss/feature/wanix/wanixiframechildtypes'
import {
  iframecapturezedcafeexport,
  iframechildhaltzedcafe,
  iframechildreadzedcafetaskrid,
  iframechildsetzedcafeready,
  iframechildsynczedcafe,
  iframechildwaitzedcafeready,
} from 'zss/feature/wanix/wanixtermiframehost'
import {
  WANIX_ZED_CAFE_IMPORT_POLL_MS,
  WANIX_ZED_CAFE_INBOX_RAMFS,
  WANIX_ZED_CAFE_WASM_CMD,
  readwanixzedcafeexportsrc,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import {
  iswanixzedcafetask,
  readlasthostpushfingerprint,
  readwanixzedcafeready,
  readwanixzedcaferestart,
  readwanixzedcafetaskrid,
  setlasthostpushfingerprint,
  setwanixzedcafeready,
  setwanixzedcaferestart,
  setwanixzedcafetaskrid,
  withzedcafeimportsuppress,
} from 'zss/feature/wanix/wanixzedcafesession'

let pendingexport = false
let polltimer: ReturnType<typeof setInterval> | undefined
let polldevice: DEVICELIKE | null = null
let pollplayer = ''

function encodetext(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function bytestobase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; ++i) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

export function encodezedcafeinboxjson(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): Uint8Array | null {
  const check = validatezedcafeexportpaths(files)
  if (!check.ok) {
    return null
  }
  const payload = {
    files: files.map((file) => ({
      path: file.path,
      data: bytestobase64(file.bytes),
    })),
  }
  return encodetext(`${JSON.stringify(payload)}\n`)
}

function yieldframe(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

function guestfilestoexport(
  files: WanixZedCafeGuestFile[],
): WANIX_ZED_CAFE_EXPORT_FILE[] {
  const out: WANIX_ZED_CAFE_EXPORT_FILE[] = []
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]!
    out.push({
      path: file.path,
      bytes: new Uint8Array(file.data),
    })
  }
  return out
}

export function fingerprintzedcafeexportfiles(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): string {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))
  let hash = 2166136261
  for (let i = 0; i < sorted.length; ++i) {
    const file = sorted[i]!
    for (let j = 0; j < file.path.length; ++j) {
      hash ^= file.path.charCodeAt(j)
      hash = Math.imul(hash, 16777619)
    }
    hash ^= file.bytes.length
    hash = Math.imul(hash, 16777619)
    for (let j = 0; j < file.bytes.length; ++j) {
      hash ^= file.bytes[j]!
      hash = Math.imul(hash, 16777619)
    }
  }
  return (hash >>> 0).toString(16)
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

function guardzedcafeexportpush(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): boolean {
  const check = validatezedcafeexportpaths(files)
  if (!check.ok) {
    apilog(
      device,
      player,
      `zed-cafe export: invalid tree — ${check.errors[0] ?? 'unknown'}`,
    )
    return false
  }
  return true
}

async function writzedcafeinbox(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): Promise<boolean> {
  const encoded = encodezedcafeinboxjson(files)
  if (!encoded) {
    apilog(
      device,
      player,
      'zed-cafe export: invalid tree — inbox encode skipped',
    )
    return false
  }
  await putwanixfile(WANIX_ZED_CAFE_INBOX_RAMFS, encoded)
  return true
}

async function readexporttree(): Promise<WANIX_ZED_CAFE_EXPORT_FILE[]> {
  const guest = await iframecapturezedcafeexport()
  return guestfilestoexport(guest)
}

async function pushzedcafeexportfiles(
  device: DEVICELIKE,
  player: string,
  taskrid: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): Promise<boolean> {
  if (!guardzedcafeexportpush(device, player, files)) {
    return false
  }
  const base = readwanixzedcafeexportsrc(taskrid)
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]!
    await putwanixfile(`${base}/${file.path}`, file.bytes)
  }
  return true
}

export async function synczedcafeexportinbox(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): Promise<boolean> {
  if (!(await writzedcafeinbox(device, player, files))) {
    return false
  }
  const restart = readwanixzedcaferestart() + 1
  setwanixzedcaferestart(restart)
  await iframechildsynczedcafe(WANIX_ZED_CAFE_WASM_CMD, restart)
  return true
}

export async function finalizewanixzedcafeaftervmboot(
  device: DEVICELIKE,
  player: string,
): Promise<boolean> {
  const taskrid = await readtaskrid()
  if (!taskrid) {
    apilog(
      device,
      player,
      'zed-cafe export: vm boot finished without export task rid',
    )
    return false
  }
  setwanixzedcafeready(true)
  setwanixzedcafetaskrid(taskrid)
  await iframechildsetzedcafeready(true)
  startzedcafepoll(device, player)
  try {
    const tree = await readexporttree()
    setlasthostpushfingerprint(fingerprintzedcafeexportfiles(tree))
  } catch {
    // poll will refresh on next tick
  }
  return true
}

async function bootzedcafeexport(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): Promise<string | null> {
  if (!(await synczedcafeexportinbox(device, player, files))) {
    return null
  }
  await yieldframe()
  const taskrid = await iframechildwaitzedcafeready()
  if (!taskrid) {
    apilog(
      device,
      player,
      'zed-cafe export: gojs export timed out — check apilog for gojs task or export bind errors',
    )
    return null
  }
  setwanixzedcafeready(true)
  setwanixzedcafetaskrid(taskrid)
  await iframechildsetzedcafeready(true)
  startzedcafepoll(device, player)
  const tree = await readexporttree()
  setlasthostpushfingerprint(fingerprintzedcafeexportfiles(tree))
  return taskrid
}

async function recoverzedcafeexport(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): Promise<string | null> {
  stopzedcafepoll()
  await iframechildhaltzedcafe()
  setwanixzedcafeready(false)
  setwanixzedcafetaskrid(null)
  return bootzedcafeexport(device, player, files)
}

async function readtaskrid(): Promise<string | null> {
  const local = readwanixzedcafetaskrid()
  if (local) {
    return local
  }
  const remote = await iframechildreadzedcafetaskrid()
  if (remote) {
    setwanixzedcafetaskrid(remote)
  }
  return remote
}

export async function runzedcafeimport(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
) {
  const {
    applyzedcafetomemory,
    logzedcafeimportresult,
    parsezedcafeexportfiles,
  } = await import('zss/feature/wanix/wanixstateimport')
  const parsed = parsezedcafeexportfiles(files)
  const changed = withzedcafeimportsuppress(() => applyzedcafetomemory(parsed))
  setlasthostpushfingerprint(fingerprintzedcafeexportfiles(files))
  await logzedcafeimportresult(device, player, parsed, changed)
}

export function startzedcafepoll(device: DEVICELIKE, player: string) {
  stopzedcafepoll()
  polldevice = device
  pollplayer = player
  polltimer = setInterval(() => {
    void tickzedcafepoll()
  }, WANIX_ZED_CAFE_IMPORT_POLL_MS)
}

export function stopzedcafepoll() {
  if (polltimer) {
    clearInterval(polltimer)
    polltimer = undefined
  }
  polldevice = null
  pollplayer = ''
}

async function tickzedcafepoll() {
  if (!readwanixzedcafeready() || !polldevice) {
    return
  }
  try {
    const tree = await readexporttree()
    const fingerprint = fingerprintzedcafeexportfiles(tree)
    if (fingerprint === readlasthostpushfingerprint()) {
      return
    }
    await runzedcafeimport(polldevice, pollplayer, tree)
  } catch {
    // poll is best-effort
  }
}

export async function wanixpullzedcafe(
  device: DEVICELIKE,
  player: string,
): Promise<boolean> {
  if (!iswanixspaceactive() || !readwanixzedcafeready()) {
    apilog(device, player, 'zed-cafe import: wanix export daemon not ready')
    return false
  }
  const tree = await readexporttree()
  await runzedcafeimport(device, player, tree)
  return true
}

export async function ensurewanixzedcafedaemon(
  device: DEVICELIKE,
  player: string,
): Promise<boolean> {
  if (readwanixzedcafeready() && readwanixzedcafetaskrid()) {
    return true
  }
  const { buildzedcafeexportfiles } = await import(
    'zss/feature/wanix/wanixstateexport'
  )
  const taskrid = await bootzedcafeexport(
    device,
    player,
    buildzedcafeexportfiles(),
  )
  return taskrid !== null
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

  let taskrid = await readtaskrid()
  if (!readwanixzedcafeready() || !taskrid) {
    taskrid = await bootzedcafeexport(device, player, files)
    return
  }

  try {
    const tree = await readexporttree()
    const treefp = fingerprintzedcafeexportfiles(tree)
    if (treefp !== readlasthostpushfingerprint()) {
      await runzedcafeimport(device, player, tree)
    }
    if (!haswanixvms()) {
      await pushzedcafeexportfiles(device, player, taskrid, files)
    }
    setlasthostpushfingerprint(fingerprintzedcafeexportfiles(files))
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    apilog(device, player, `zed-cafe export: live push failed (${detail}) — recovering`)
    await recoverzedcafeexport(device, player, files)
  }
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
  stopzedcafepoll()
}

export { iswanixzedcafetask }
