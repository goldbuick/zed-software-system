import type { DEVICELIKE, WANIX_ZED_CAFE_IMPORT_RESULT } from 'zss/device/api'
import { apilog, vmexportzedcafe, vmimportzedcafe } from 'zss/device/api'
import {
  callwanixrpc,
  waitwanixexportcontentready,
} from 'zss/feature/wanix/wanixbridge'
import {
  wanixperfdelta,
  wanixperfmark,
  wanixperfnow,
} from 'zss/feature/wanix/wanixperf'
import { readwanixroomconfig } from 'zss/feature/wanix/wanixroom'
import {
  type WANIX_ZED_CAFE_EXPORT_FILE,
  buildzedcafeexportfiles,
  readbookcountfromexportfiles,
  zedcafeexportdocsdiffer,
  zedcafeexportfilestodoc,
} from 'zss/feature/wanix/wanixstateexport'
import {
  WANIX_VM_ZEDCAFE_EXPORT_FETCH_MS,
  WANIX_VM_ZEDCAFE_IMPORT_MS,
  WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
  WANIX_ZEDCAFE_EXPORT_WAIT_MS,
  WANIX_ZEDCAFE_IMPORT_POLL_MS,
  WANIX_ZEDCAFE_WASM_CMD,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import {
  clearlasthostpushdoc,
  iswanixzedcafetask,
  readlasthostpushdoc,
  readzedcafeguestdirty,
  readzedcafepollactive,
  setlasthostpushdoc,
  setzedcafeguestdirty,
  setzedcafepollactive,
} from 'zss/feature/wanix/wanixzedcafesession'
import type {
  WanixZedCafeGuestFile,
  WanixZedCafeHostState,
} from 'zss/feature/wanix/wanixzedcafetypes'
import { validatezedcafeexportpaths } from 'zss/feature/wanix/zedcafetreeschema'

let pendingexport = false
let polltimer: ReturnType<typeof setInterval> | undefined
let polldevice: DEVICELIKE | null = null
let pollplayer = ''

type VmZedCafeExportWaiter = {
  resolve: (files: WANIX_ZED_CAFE_EXPORT_FILE[]) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

type VmZedCafeImportWaiter = {
  resolve: (result: WANIX_ZED_CAFE_IMPORT_RESULT) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

let pendingexportwait: VmZedCafeExportWaiter | null = null
let pendingimportwait: VmZedCafeImportWaiter | null = null

function tracezedcafeexport(message: string) {
  console.info(`[zedcafe-export] ${message}`)
}

function guestfilestoexport(
  files: WanixZedCafeGuestFile[],
): WANIX_ZED_CAFE_EXPORT_FILE[] {
  const out: WANIX_ZED_CAFE_EXPORT_FILE[] = []
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    out.push({
      path: file.path,
      bytes: new Uint8Array(file.data),
    })
  }
  return out
}

export function guestfilestoexportfiles(
  files: WanixZedCafeGuestFile[],
): WANIX_ZED_CAFE_EXPORT_FILE[] {
  return guestfilestoexport(files)
}

export function exportfilestoguestfiles(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): WanixZedCafeGuestFile[] {
  const out: WanixZedCafeGuestFile[] = []
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    out.push({
      path: file.path,
      data: [...file.bytes],
    })
  }
  return out
}

function buildwanixbootzedcafestate(): WanixZedCafeHostState {
  return {
    cmd: WANIX_ZEDCAFE_WASM_CMD,
    generation: 1,
    ready: false,
    taskrid: null,
  }
}

export function readwanixbootzedcafestatefrommemory(): WanixZedCafeHostState {
  buildzedcafeexportfiles()
  return buildwanixbootzedcafestate()
}

export function readwanixbootzedcafestate(): WanixZedCafeHostState {
  return readwanixbootzedcafestatefrommemory()
}

export function readzedcafeexportbookcount(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): number {
  const stats = files.find((file) => file.path === 'stats.json')
  if (!stats) {
    return 0
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(stats.bytes)) as {
      bookCount?: unknown
    }
    return typeof parsed.bookCount === 'number' ? parsed.bookCount : 0
  } catch {
    return 0
  }
}

export function resolvevmzedcafeexportwaiter(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): boolean {
  if (!pendingexportwait) {
    return false
  }
  clearTimeout(pendingexportwait.timer)
  pendingexportwait.resolve(files)
  pendingexportwait = null
  return true
}

export function resolvevmzedcafeimportwaiter(
  result: WANIX_ZED_CAFE_IMPORT_RESULT,
): boolean {
  if (!pendingimportwait) {
    return false
  }
  clearTimeout(pendingimportwait.timer)
  pendingimportwait.resolve(result)
  pendingimportwait = null
  return true
}

export function requestvmzedcafeexportfiles(
  device: DEVICELIKE,
  player: string,
  timeoutms = WANIX_VM_ZEDCAFE_EXPORT_FETCH_MS,
): Promise<WANIX_ZED_CAFE_EXPORT_FILE[]> {
  if (pendingexportwait) {
    return Promise.reject(
      new Error('zedcafe export: concurrent vm export fetch'),
    )
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingexportwait = null
      reject(new Error('zedcafe export: vm export fetch timed out'))
    }, timeoutms)
    pendingexportwait = { resolve, reject, timer }
    vmexportzedcafe(device, player)
  })
}

function requestvmzedcafeimport(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
  timeoutms = WANIX_VM_ZEDCAFE_IMPORT_MS,
): Promise<WANIX_ZED_CAFE_IMPORT_RESULT> {
  if (pendingimportwait) {
    return Promise.reject(new Error('zedcafe import: concurrent vm import'))
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingimportwait = null
      reject(new Error('zedcafe import: vm import timed out'))
    }, timeoutms)
    pendingimportwait = { resolve, reject, timer }
    vmimportzedcafe(device, player, files)
  })
}

export async function fetchzedcafeexportfiles(
  device: DEVICELIKE,
  player: string,
  timeoutms = WANIX_VM_ZEDCAFE_EXPORT_FETCH_MS,
): Promise<WANIX_ZED_CAFE_EXPORT_FILE[]> {
  return requestvmzedcafeexportfiles(device, player, timeoutms)
}

export function fingerprintzedcafeexportfiles(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): string {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))
  let hash = 2166136261
  for (let i = 0; i < sorted.length; ++i) {
    const file = sorted[i]
    for (let j = 0; j < file.path.length; ++j) {
      hash ^= file.path.charCodeAt(j)
      hash = Math.imul(hash, 16777619)
    }
    hash ^= file.bytes.length
    hash = Math.imul(hash, 16777619)
    for (let j = 0; j < file.bytes.length; ++j) {
      hash ^= file.bytes[j]
      hash = Math.imul(hash, 16777619)
    }
  }
  return (hash >>> 0).toString(16)
}

function guestdiffersfromlastpush(tree: WANIX_ZED_CAFE_EXPORT_FILE[]): boolean {
  return zedcafeexportdocsdiffer(
    readlasthostpushdoc(),
    zedcafeexportfilestodoc(tree),
  )
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
  partial?: boolean,
): boolean {
  const check = validatezedcafeexportpaths(files, { partial })
  if (!check.ok) {
    const detail = check.errors[0] ?? 'unknown'
    apilog(device, player, `zedcafe export: invalid tree — ${detail}`)
    console.error(`zedcafe export: invalid tree — ${detail}`)
    return false
  }
  return true
}

async function readexporttree(): Promise<WANIX_ZED_CAFE_EXPORT_FILE[]> {
  const guest = await callwanixrpc<WanixZedCafeGuestFile[]>(
    'readzedcafeexportfiles',
    [],
    WANIX_ZEDCAFE_EXPORT_WAIT_MS,
  )
  return guestfilestoexport(guest ?? [])
}

export type PushZedCafeSyncOptions = {
  /** Post-import re-export may push while guest-dirty is still set. */
  fromimport?: boolean
  /** Upsert subset — skip full-tree schema; store nextdoc as shadow after push. */
  partial?: boolean
  /** Full next export doc after a partial upsert (path → parsed JSON). */
  nextdoc?: Record<string, unknown>
}

export async function pushzedcafesynctoiframe(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
  options?: PushZedCafeSyncOptions,
): Promise<boolean> {
  if (!guardzedcafeexportpush(device, player, files, options?.partial)) {
    return false
  }
  if (!iswanixspaceactive()) {
    tracezedcafeexport(
      `pending-export mark memcount=${readbookcountfromexportfiles(files)}`,
    )
    markwanixzedcafependingexport()
    return false
  }
  if (readzedcafeguestdirty() && !options?.fromimport) {
    tracezedcafeexport(
      `sync-skip guest-dirty memcount=${readbookcountfromexportfiles(files)}`,
    )
    return false
  }
  // Pull guest FS edits into sim before overwriting the tree. Tick-driven host
  // export otherwise stomps terrain.json writes (greenring) before the poll.
  if (!options?.fromimport) {
    try {
      const tree = await readexporttree()
      if (guestdiffersfromlastpush(tree)) {
        const imported = await runzedcafeimport(device, player, tree)
        if (imported) {
          return true
        }
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      tracezedcafeexport(`sync-guest-import-skip ${detail}`)
    }
    if (readzedcafeguestdirty()) {
      tracezedcafeexport(
        `sync-skip guest-dirty-after-import memcount=${readbookcountfromexportfiles(files)}`,
      )
      return false
    }
  }
  const memcount = readbookcountfromexportfiles(files)
  const pushdoc =
    options?.nextdoc ??
    (options?.partial
      ? undefined
      : zedcafeexportfilestodoc(files))
  if (
    !options?.partial &&
    !options?.fromimport &&
    pushdoc &&
    !zedcafeexportdocsdiffer(readlasthostpushdoc(), pushdoc)
  ) {
    tracezedcafeexport(`sync-stale needed=false memcount=${memcount}`)
    return true
  }
  wanixperfmark('export-push-start', {
    memcount,
    paths: files.length,
    partial: !!options?.partial,
  })
  const syncresult = await callwanixrpc<{
    ok: boolean
    taskrid: string | null
  }>(
    'synczedcafeexport',
    [exportfilestoguestfiles(files)],
    WANIX_ZEDCAFE_EXPORT_WAIT_MS,
  )
  if (!syncresult?.ok) {
    return false
  }
  const shadowdoc = options?.nextdoc ?? zedcafeexportfilestodoc(files)
  if (memcount > 0 || (options?.partial && Object.keys(shadowdoc).length > 0)) {
    const taskrid = syncresult.taskrid ?? (await readtaskrid())
    if (taskrid && (memcount > 0 || files.some((f) => f.path === 'stats.json'))) {
      await waitzedcafecontentready(taskrid)
    }
    if (!readzedcafepollactive() && memcount > 0) {
      await markzedcafepollready(device, player, shadowdoc)
    } else {
      setlasthostpushdoc(shadowdoc)
    }
  } else {
    setlasthostpushdoc(shadowdoc)
  }
  tracezedcafeexport(
    `sync-to-iframe memcount=${memcount} paths=${files.length} taskrid=${syncresult.taskrid ?? 'none'} partial=${!!options?.partial}`,
  )
  return true
}

export async function ensurezedcafeexportready(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): Promise<string | null> {
  const ok = await pushzedcafesynctoiframe(device, player, files)
  if (!ok) {
    return null
  }
  return readtaskrid()
}

function clearzedcafeexportsession() {
  stopzedcafepoll()
  clearlasthostpushdoc()
  setzedcafeguestdirty(false)
}

async function waitzedcafecontentready(
  taskrid: string,
  timeoutms = WANIX_ZEDCAFE_EXPORT_WAIT_MS,
): Promise<boolean> {
  const waitstart = wanixperfnow()
  const quick = await callwanixrpc<boolean>(
    'waitzedcafecontentready',
    [taskrid, 0],
    5_000,
  )
  if (quick) {
    wanixperfmark('content-ready-end', {
      taskrid,
      path: 'rpc-quick',
      ...wanixperfdelta(waitstart),
    })
    return true
  }
  try {
    await waitwanixexportcontentready(
      taskrid,
      Math.min(timeoutms, WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS),
    )
    wanixperfmark('content-ready-end', {
      taskrid,
      path: 'event',
      ...wanixperfdelta(waitstart),
    })
    return true
  } catch {
    const result = await callwanixrpc<boolean>(
      'waitzedcafecontentready',
      [taskrid, timeoutms],
      timeoutms + 5_000,
    )
    wanixperfmark('content-ready-end', {
      taskrid,
      path: 'rpc-poll',
      ok: !!result,
      ...wanixperfdelta(waitstart),
    })
    return !!result
  }
}

export function readhostexportfilesfrommemory(): WANIX_ZED_CAFE_EXPORT_FILE[] {
  return buildzedcafeexportfiles()
}

/** Cafe books live in the sim worker; main-thread memory is often empty. */
export async function readhostexportfilesasync(
  device: DEVICELIKE,
  player: string,
): Promise<WANIX_ZED_CAFE_EXPORT_FILE[]> {
  const memoryfiles = readhostexportfilesfrommemory()
  const memcount = readbookcountfromexportfiles(memoryfiles)
  if (memcount > 0) {
    tracezedcafeexport(`host-export source=main-memory memcount=${memcount}`)
    return memoryfiles
  }
  tracezedcafeexport('host-export source=sim-worker fetch')
  const fetchstart = wanixperfnow()
  const files = await requestvmzedcafeexportfiles(device, player)
  wanixperfmark('sim-export-fetch-end', {
    memcount: readbookcountfromexportfiles(files),
    paths: files.length,
    source: 'sim-worker',
    ...wanixperfdelta(fetchstart),
  })
  return files
}

export async function fetchhostexportfilesfromvm(
  device: DEVICELIKE,
  player: string,
  timeoutms = WANIX_VM_ZEDCAFE_EXPORT_FETCH_MS,
): Promise<WANIX_ZED_CAFE_EXPORT_FILE[]> {
  return fetchzedcafeexportfiles(device, player, timeoutms)
}

async function markzedcafepollready(
  _device: DEVICELIKE,
  _player: string,
  hostpushdoc: Record<string, unknown>,
) {
  await callwanixrpc('setzedcafeready', [true])
  startzedcafepoll(_device, _player)
  // Shadow is host-authored content only — do not re-read guest tree.
  setlasthostpushdoc(hostpushdoc)
}

async function readtaskrid(): Promise<string | null> {
  return callwanixrpc<string | null>('readzedcafetaskrid', [])
}

async function iszedcafeexportlive(
  taskrid: string | null | undefined,
): Promise<boolean> {
  if (!taskrid) {
    return false
  }
  return callwanixrpc<boolean>(
    'iszedcafeexportlive',
    [taskrid],
    WANIX_ZEDCAFE_EXPORT_WAIT_MS,
  ).then((result) => !!result)
}

export async function runzedcafeimport(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): Promise<boolean> {
  const check = validatezedcafeexportpaths(files)
  if (!check.ok) {
    const detail = check.errors[0] ?? 'unknown'
    apilog(device, player, `zedcafe import: invalid tree — ${detail}`)
    return false
  }
  setzedcafeguestdirty(true)
  try {
    const result = await requestvmzedcafeimport(device, player, files)
    if (!result.ok) {
      apilog(
        device,
        player,
        `zedcafe import: sim apply failed — ${result.error ?? 'unknown'}`,
      )
      return false
    }
    if (!result.changed) {
      apilog(
        device,
        player,
        'zedcafe import: guest tree matched memory (no diff)',
      )
    } else {
      apilog(
        device,
        player,
        `zedcafe import: synced ${result.bookcount ?? 0} book(s) from guest tree`,
      )
    }
    const applied = await requestvmzedcafeexportfiles(device, player)
    const pushed = await pushzedcafesynctoiframe(device, player, applied, {
      fromimport: true,
    })
    if (pushed) {
      setzedcafeguestdirty(false)
    }
    return pushed
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    apilog(device, player, `zedcafe import: ${detail}`)
    return false
  }
}

export function startzedcafepoll(device: DEVICELIKE, player: string) {
  stopzedcafepoll()
  polldevice = device
  pollplayer = player
  setzedcafepollactive(true)
  polltimer = setInterval(() => {
    void tickzedcafepoll()
  }, WANIX_ZEDCAFE_IMPORT_POLL_MS)
}

export function stopzedcafepoll() {
  if (polltimer) {
    clearInterval(polltimer)
    polltimer = undefined
  }
  polldevice = null
  pollplayer = ''
  setzedcafepollactive(false)
}

async function tickzedcafepoll() {
  if (!readzedcafepollactive() || !polldevice) {
    return
  }
  const device = polldevice
  const player = pollplayer
  let tree: WANIX_ZED_CAFE_EXPORT_FILE[]
  try {
    const taskrid = await readtaskrid()
    if (!(await iszedcafeexportlive(taskrid))) {
      return
    }
    tree = await readexporttree()
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    tracezedcafeexport(`poll-rpc-error ${detail}`)
    apilog(device, player, `zedcafe: import poll failed — ${detail}`)
    stopzedcafepoll()
    return
  }
  if (!guestdiffersfromlastpush(tree)) {
    return
  }
  try {
    await runzedcafeimport(device, player, tree)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    tracezedcafeexport(`poll-import-error ${detail}`)
    apilog(device, player, `zedcafe: import apply failed — ${detail}`)
    // Keep poll running so the next tick can retry.
  }
}

export function iswanixspaceactive(): boolean {
  return readwanixroomconfig().mode !== 'idle'
}

export async function assertfindplayersexportready(
  device: DEVICELIKE,
  player: string,
): Promise<void> {
  const taskrid = await readtaskrid()
  if (!taskrid) {
    throw new Error(
      'findplayers: zedcafe export mount missing — drop any wasm task first or load books and retry',
    )
  }
  let treecount = -1
  try {
    treecount = readbookcountfromexportfiles(await readexporttree())
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error(`findplayers: export tree unreadable — ${detail}`)
  }
  if (treecount <= 0) {
    throw new Error(
      'findplayers: no books in export tree — sim worker returned empty export; load a world with books and retry',
    )
  }
  apilog(
    device,
    player,
    `findplayers: export has ${treecount} book(s) — spawning scanner…`,
  )
}

export async function ensurewanixzedcafedaemon(
  device: DEVICELIKE,
  player: string,
  files?: WANIX_ZED_CAFE_EXPORT_FILE[],
): Promise<void> {
  const exportfiles = files ?? (await readhostexportfilesasync(device, player))
  const memcount = readbookcountfromexportfiles(exportfiles)
  tracezedcafeexport(`daemon start memcount=${memcount}`)
  const ok = await pushzedcafesynctoiframe(device, player, exportfiles)
  if (!ok && memcount > 0) {
    throw new Error('zedcafe export sync failed')
  }
}

export async function wanixhandleexportstate(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
) {
  if (resolvevmzedcafeexportwaiter(files)) {
    tracezedcafeexport(
      `handleexportstate snapshot-only memcount=${readbookcountfromexportfiles(files)}`,
    )
    return
  }

  if (!iswanixspaceactive()) {
    tracezedcafeexport(
      `pending-export mark memcount=${readbookcountfromexportfiles(files)}`,
    )
    apilog(
      device,
      player,
      'zedcafe: export saved — will apply when wanix starts (drop a task or #wanix vm)',
    )
    markwanixzedcafependingexport()
    return
  }
  clearwanixzedcafependingexport()

  let importedguest = false
  try {
    const tree = await readexporttree()
    if (guestdiffersfromlastpush(tree)) {
      importedguest = await runzedcafeimport(device, player, tree)
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    tracezedcafeexport(`handleexportstate import-skip ${detail}`)
  }

  if (importedguest) {
    // runzedcafeimport already pushed the post-import sim export.
    return
  }
  if (readzedcafeguestdirty()) {
    tracezedcafeexport('handleexportstate skip-push guest-dirty')
    return
  }
  await pushzedcafesynctoiframe(device, player, files)
}

export async function wanixdrainpendingzedcafeexport(
  device: DEVICELIKE,
  player: string,
) {
  if (!readwanixzedcafependingexport()) {
    return
  }
  clearwanixzedcafependingexport()
  const files = await readhostexportfilesasync(device, player)
  const memcount = readbookcountfromexportfiles(files)
  tracezedcafeexport(`pending-export drain memcount=${memcount}`)
  if (memcount > 0) {
    apilog(
      device,
      player,
      `zedcafe: applying queued export (${memcount} books)…`,
    )
  }
  await pushzedcafesynctoiframe(device, player, files)
}

/** Clear host export session when wanix room returns to idle. */
export function resetwanixzedcafeonidle() {
  clearwanixzedcafependingexport()
  clearzedcafeexportsession()
}

/** Test hook — reset pending flag. */
export function resetwanixzedcafefortest() {
  if (pendingexportwait) {
    clearTimeout(pendingexportwait.timer)
    pendingexportwait.reject(new Error('zedcafe export: test reset'))
    pendingexportwait = null
  }
  if (pendingimportwait) {
    clearTimeout(pendingimportwait.timer)
    pendingimportwait.reject(new Error('zedcafe import: test reset'))
    pendingimportwait = null
  }
  pendingexport = false
  clearzedcafeexportsession()
}

export { iswanixzedcafetask }
