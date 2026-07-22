import { compare } from 'fast-json-patch'
import type { WANIX_ZED_CAFE_IMPORT_RESULT } from 'zss/device/api'
import {
  apilog,
  vmexportzedcafe,
  vmimportzedcafe,
  wanixserveriszedcafeexportlive,
  wanixserverreadzedcafeexportfiles,
  wanixserverreadzedcafetaskrid,
  wanixserversetzedcafeready,
  wanixserversynczedcafeexport,
} from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/types'
import {
  type PushZedCafeSyncOptions,
  acknowledgezedcafeguestdirtygen,
  bumpzedcafeguestdirtygen,
  clearlasthostpushdoc,
  clearwanixzedcafependingexport as clearpendingexportstate,
  drainpendingdirtypaths,
  markpendingdirtypaths,
  markwanixzedcafependingexport as markpendingexportstate,
  readlasthostpushdoc,
  readwanixzedcafependingexport as readpendingexportstate,
  readpendingexportwait,
  readpendingimportwait,
  readpendingpollkick,
  readpendingpollphase,
  readpendingsync,
  readpolldevice,
  readpollplayer,
  readzedcafeguestdirty,
  readzedcafeguesttreeclean,
  readzedcafepollactive,
  setlasthostpushdoc,
  setpendingexportwait,
  setpendingimportwait,
  setpendingpollkick,
  setpendingpollphase,
  setpendingsync,
  setpolldevice,
  setpollplayer,
  setzedcafeguestdirty,
  setzedcafepollactive,
} from 'zss/device/wanixclient/state'
import { readwanixroomconfig } from 'zss/device/wanixclient/wanixroom'
import { iszedsyncreadywaitpending } from 'zss/device/wanixclient/wanixzedsync'
import {
  wanixperfdelta,
  wanixperfmark,
  wanixperfnow,
} from 'zss/feature/wanix/wanixperf'
import {
  type WANIX_ZED_CAFE_EXPORT_FILE,
  acknowledgezedcafeexportpush,
  buildzedcafeexportfiles,
  filterzedcafeexportpathsagainstsimdirty,
  readbookcountfromexportfiles,
  readzedcafeexportpendingdirty,
  readzedcafeexportremovepaths,
  readzedcafeexportstatscontentready,
  readzedcafeexportupsertpaths,
  zedcafeexportdocsdiffer,
  zedcafeexportdoctofiles,
  zedcafeexportfilestodoc,
} from 'zss/feature/wanix/wanixstateexport'
import {
  WANIX_VM_ZEDCAFE_EXPORT_FETCH_MS,
  WANIX_VM_ZEDCAFE_IMPORT_MS,
  WANIX_ZEDCAFE_WASM_CMD,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import type {
  WanixZedCafeGuestFile,
  WanixZedCafeHostState,
} from 'zss/feature/wanix/wanixzedcafetypes'
import { validatezedcafeexportpaths } from 'zss/feature/wanix/zedcafetreeschema'

function tracezedcafeexport(message: string) {
  console.info(`[zedcafe-export] ${message}`)
}

function guestfilestoexport(
  files: WanixZedCafeGuestFile[],
): WANIX_ZED_CAFE_EXPORT_FILE[] {
  const out: WANIX_ZED_CAFE_EXPORT_FILE[] = []
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    const data = file.data
    out.push({
      path: file.path,
      bytes:
        data instanceof Uint8Array
          ? data
          : new Uint8Array(data as ArrayLike<number>),
    })
  }
  return out
}

/**
 * These bytes travel to the wanix iframe via device.emit -> BroadcastChannel,
 * which always structured-clones (no transfer list) — see
 * zss/feature/wanix/wanixzedcafetransfer.ts for a transferable-ArrayBuffer
 * helper that only applies on a direct Window/Worker postMessage call.
 */
export function exportfilestoguestfiles(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): WanixZedCafeGuestFile[] {
  const out: WanixZedCafeGuestFile[] = []
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    out.push({
      path: file.path,
      data: file.bytes,
    })
  }
  return out
}

function readzedcafepayloadbytes(
  files: { bytes?: Uint8Array; data?: Uint8Array | ArrayLike<number> }[],
): number {
  let total = 0
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    const payload = file.bytes ?? file.data
    if (payload instanceof Uint8Array) {
      total += payload.byteLength
    } else if (payload) {
      total += payload.length
    }
  }
  return total
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

export function resolvevmzedcafeexportwaiter(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): boolean {
  const pending = readpendingexportwait()
  if (!pending) {
    return false
  }
  clearTimeout(pending.timer)
  pending.resolve(files)
  setpendingexportwait(null)
  return true
}

export function resolvevmzedcafeimportwaiter(
  result: WANIX_ZED_CAFE_IMPORT_RESULT,
): boolean {
  const pending = readpendingimportwait()
  if (!pending) {
    return false
  }
  clearTimeout(pending.timer)
  pending.resolve(result)
  setpendingimportwait(null)
  return true
}

export function requestvmzedcafeexportfiles(
  device: DEVICELIKE,
  player: string,
  timeoutms = WANIX_VM_ZEDCAFE_EXPORT_FETCH_MS,
): Promise<WANIX_ZED_CAFE_EXPORT_FILE[]> {
  const pending = readpendingexportwait()
  if (pending) {
    return pending.promise
  }
  let resolve!: (files: WANIX_ZED_CAFE_EXPORT_FILE[]) => void
  let reject!: (error: Error) => void
  const promise = new Promise<WANIX_ZED_CAFE_EXPORT_FILE[]>((res, rej) => {
    resolve = res
    reject = rej
  })
  const timer = setTimeout(() => {
    setpendingexportwait(null)
    reject(new Error('zedcafe export: vm export fetch timed out'))
  }, timeoutms)
  setpendingexportwait({ resolve, reject, timer, promise })
  vmexportzedcafe(device, player)
  return promise
}

function requestvmzedcafeimport(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
  options?: { partial?: boolean; removepaths?: string[]; timeoutms?: number },
): Promise<WANIX_ZED_CAFE_IMPORT_RESULT> {
  if (readpendingimportwait()) {
    return Promise.reject(new Error('zedcafe import: concurrent vm import'))
  }
  const timeoutms = options?.timeoutms ?? WANIX_VM_ZEDCAFE_IMPORT_MS
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      setpendingimportwait(null)
      reject(new Error('zedcafe import: vm import timed out'))
    }, timeoutms)
    setpendingimportwait({ resolve, reject, timer })
    vmimportzedcafe(device, player, files, {
      partial: options?.partial,
      removepaths: options?.removepaths,
    })
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

/** Full guest-vs-shadow compare (import poll must not path-scope). */
function guestdiffersfromlastpush(tree: WANIX_ZED_CAFE_EXPORT_FILE[]): boolean {
  return zedcafeexportdocsdiffer(
    readlasthostpushdoc(),
    zedcafeexportfilestodoc(tree),
  )
}

export function markwanixzedcafependingexport() {
  markpendingexportstate()
}

export function readwanixzedcafependingexport(): boolean {
  return readpendingexportstate()
}

export function clearwanixzedcafependingexport() {
  clearpendingexportstate()
}

function guardzedcafeexportpush(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
  partial?: boolean,
): boolean {
  if (files.length === 0 && partial) {
    return true
  }
  const check = validatezedcafeexportpaths(files, { partial })
  if (!check.ok) {
    const detail = check.errors[0] ?? 'unknown'
    apilog(device, player, `zedcafe export: invalid tree — ${detail}`)
    console.error(`zedcafe export: invalid tree — ${detail}`)
    return false
  }
  return true
}

function guesttreestatsready(guesttree: WANIX_ZED_CAFE_EXPORT_FILE[]): boolean {
  const stats = guesttree.find((file) => file.path === 'stats.json')
  return !!stats && readzedcafeexportstatscontentready(stats.bytes)
}

function readorphanremovepaths(
  guesttree: WANIX_ZED_CAFE_EXPORT_FILE[],
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): string[] {
  const nextpaths = new Set<string>()
  for (let i = 0; i < files.length; ++i) {
    nextpaths.add(files[i].path)
  }
  const orphans: string[] = []
  for (let i = 0; i < guesttree.length; ++i) {
    const path = guesttree[i].path
    if (!nextpaths.has(path)) {
      orphans.push(path)
    }
  }
  return orphans
}

export function applyzedcafeexportfiles(
  device: DEVICELIKE,
  player: string,
  data: unknown,
): void {
  const guest = Array.isArray(data) ? (data as WanixZedCafeGuestFile[]) : []
  const files = guestfilestoexport(guest)
  // Prefer import poll completion: host guesttree must not steal this reply and
  // leave pendingpollphase stuck at 'tree' (kicks would no-op forever).
  if (readpendingpollphase() === 'tree' && readpolldevice()) {
    const needguesttreereread = readpendingsync()?.phase === 'guesttree'
    setpendingpollphase(null)
    void continuepollaftertree(device, player, files).finally(() => {
      flushpendingpollkick()
    })
    if (needguesttreereread) {
      wanixserverreadzedcafeexportfiles(device, player)
    }
    return
  }
  if (readpendingsync()?.phase === 'guesttree') {
    void continuepushafterguesttree(device, player, files)
    return
  }
}

export function applyzedcafetaskrid(
  device: DEVICELIKE,
  player: string,
  data: unknown,
): void {
  const rid = typeof data === 'string' ? data : null
  if (readpendingsync()?.phase === 'sync' && rid) {
    // sync result path preferred
  }
  if (readpendingpollphase() === 'taskrid' && readpolldevice()) {
    setpendingpollphase('live')
    wanixserveriszedcafeexportlive(device, player, rid ?? undefined)
    return
  }
}

export function applyzedcafeexportlive(
  device: DEVICELIKE,
  player: string,
  data: unknown,
): void {
  if (readpendingpollphase() !== 'live') {
    return
  }
  if (data !== true) {
    setpendingpollphase(null)
    flushpendingpollkick()
    return
  }
  setpendingpollphase('tree')
  wanixserverreadzedcafeexportfiles(device, player)
}

export function applyzedcafesyncresult(
  device: DEVICELIKE,
  player: string,
  data: unknown,
): void {
  const pendingsync = readpendingsync()
  if (!pendingsync) {
    return
  }
  const ctx = pendingsync
  const result = data as {
    ok?: boolean
    taskrid?: string | null
    pending?: boolean
    error?: string
  }
  if (result?.pending) {
    return
  }
  if (!result?.ok) {
    setpendingsync(null)
    tracezedcafeexport(`sync-to-iframe failed ${result?.error ?? 'unknown'}`)
    return
  }
  const shadowdoc = ctx.shadowdoc
  const memcount = ctx.memcount
  const files = ctx.files
  const options = ctx.options
  const removepaths = options?.removepaths ?? []
  // Iframe only returns sync ok after pushzedcafeexportlive finishes — arm here.
  // (Do not wait on a separate content-ready race; that path was redundant.)
  if (!readzedcafepollactive() && memcount > 0) {
    markzedcafepollready(device, player, shadowdoc)
  } else {
    setlasthostpushdoc(shadowdoc)
    flushpendingpollkick()
  }
  acknowledgezedcafeexportpush()
  if (options?.fromimport || readzedcafeguesttreeclean()) {
    acknowledgezedcafeguestdirtygen()
  }
  setpendingsync(null)
  wanixperfmark('export-push-ack', {
    memcount,
    paths: files.length,
    removed: removepaths.length,
    partial: !!options?.partial,
    bytes: readzedcafepayloadbytes(files),
  })
  tracezedcafeexport(
    `sync-to-iframe memcount=${memcount} paths=${files.length} removed=${removepaths.length} taskrid=${result.taskrid ?? 'none'} partial=${!!options?.partial}`,
  )
}

/** Guest mount content-ready — poll arming is owned by sync result / drop-pull. */
export function handlewanixexportready(
  _device: DEVICELIKE,
  _player: string,
  _taskrid: string,
  event?: string,
): void {
  if (event && event !== 'content-ready') {
    return
  }
}

async function continuepushafterguesttree(
  device: DEVICELIKE,
  player: string,
  guesttree: WANIX_ZED_CAFE_EXPORT_FILE[],
): Promise<void> {
  const pendingsync = readpendingsync()
  if (pendingsync?.phase !== 'guesttree') {
    return
  }
  const ctx = pendingsync
  const files = ctx.files
  const options = ctx.options
  if (guestdiffersfromlastpush(guesttree)) {
    if (!guesttreestatsready(guesttree)) {
      // Remount / not content-ready — do not import incomplete tree; fall through
      // to host push so activate can repopulate stats.json.
      tracezedcafeexport(
        `sync-skip guest-not-ready memcount=${readbookcountfromexportfiles(files)}`,
      )
    } else {
      // Keep guest writes until import lands — never fall through to host wipe.
      setzedcafeguestdirty(true)
      try {
        const imported = await runzedcafeimport(device, player, guesttree)
        if (imported) {
          // fromimport push may own pendingsync (phase sync); only clear our guesttree.
          if (readpendingsync()?.phase === 'guesttree') {
            setpendingsync(null)
          }
          return
        }
        setpendingsync(null)
        tracezedcafeexport(
          `sync-skip guest-dirty-import-failed memcount=${readbookcountfromexportfiles(files)}`,
        )
        return
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err)
        setpendingsync(null)
        tracezedcafeexport(`sync-guest-import-skip ${detail}`)
        return
      }
    }
  }
  if (readzedcafeguestdirty()) {
    setpendingsync(null)
    tracezedcafeexport(
      `sync-skip guest-dirty-after-import memcount=${readbookcountfromexportfiles(files)}`,
    )
    return
  }
  let removepaths = options?.removepaths ?? []
  // Serialize removes vs live remote→zedcafe writers (zedsync): never prune
  // orphans while guest-dirty, while a zedsync seed is still writing into the
  // zedcafe export mount (iszedsyncreadywaitpending), or on fromimport
  // (upsert first).
  if (
    !options?.partial &&
    !options?.fromimport &&
    !readzedcafeguestdirty() &&
    !iszedsyncreadywaitpending()
  ) {
    const orphans = readorphanremovepaths(guesttree, files)
    if (orphans.length > 0) {
      removepaths = [...new Set([...removepaths, ...orphans])]
    }
  }
  if (readzedcafeguestdirty() && !options?.fromimport) {
    removepaths = []
  }
  const memcount = readbookcountfromexportfiles(files)
  const pushdoc =
    options?.nextdoc ??
    (options?.partial ? undefined : zedcafeexportfilestodoc(files))
  if (
    !options?.partial &&
    !options?.fromimport &&
    pushdoc &&
    removepaths.length === 0 &&
    !zedcafeexportdocsdiffer(readlasthostpushdoc(), pushdoc) &&
    (memcount === 0 || guesttreestatsready(guesttree))
  ) {
    setpendingsync(null)
    tracezedcafeexport(`sync-stale needed=false memcount=${memcount}`)
    return
  }
  const shadowdoc = options?.nextdoc ?? zedcafeexportfilestodoc(files)
  setpendingsync({
    ...ctx,
    phase: 'sync',
    shadowdoc,
    memcount,
    options: { ...options, removepaths },
  })
  wanixperfmark('export-push-start', {
    memcount,
    paths: files.length,
    removed: removepaths.length,
    partial: !!options?.partial,
    bytes: readzedcafepayloadbytes(files),
  })
  wanixserversynczedcafeexport(
    device,
    player,
    exportfilestoguestfiles(files),
    removepaths,
  )
}

export function pushzedcafesynctoiframe(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
  options?: PushZedCafeSyncOptions,
): boolean {
  const optionremoves = options?.removepaths ?? []
  if (
    !guardzedcafeexportpush(device, player, files, options?.partial) ||
    (files.length === 0 && optionremoves.length === 0)
  ) {
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
  if (!options?.fromimport) {
    const pending = readpendingsync()
    if (
      pending &&
      (pending.phase === 'guesttree' || pending.phase === 'sync')
    ) {
      tracezedcafeexport(
        `sync-skip pending-inflight phase=${pending.phase} memcount=${readbookcountfromexportfiles(files)}`,
      )
      return false
    }
    const shadowdoc = options?.nextdoc ?? zedcafeexportfilestodoc(files)
    const memcount = readbookcountfromexportfiles(files)
    // Clean guest: skip full-tree read; write host partial directly.
    if (options?.partial && readzedcafeguesttreeclean()) {
      const removepaths = options?.removepaths ?? []
      setpendingsync({
        device,
        player,
        files,
        options,
        shadowdoc,
        memcount,
        phase: 'sync',
      })
      wanixperfmark('export-push-start', {
        memcount,
        paths: files.length,
        removed: removepaths.length,
        partial: true,
        skipguesttree: true,
        bytes: readzedcafepayloadbytes(files),
      })
      wanixserversynczedcafeexport(
        device,
        player,
        exportfilestoguestfiles(files),
        removepaths,
      )
      return true
    }
    setpendingsync({
      device,
      player,
      files,
      options,
      shadowdoc,
      memcount,
      phase: 'guesttree',
    })
    wanixserverreadzedcafeexportfiles(device, player)
    return true
  }
  const removepaths = optionremoves
  const memcount = readbookcountfromexportfiles(files)
  const shadowdoc = options?.nextdoc ?? zedcafeexportfilestodoc(files)
  setpendingsync({
    device,
    player,
    files,
    options,
    shadowdoc,
    memcount,
    phase: 'sync',
  })
  wanixperfmark('export-push-start', {
    memcount,
    paths: files.length,
    removed: removepaths.length,
    partial: !!options?.partial,
    bytes: readzedcafepayloadbytes(files),
  })
  wanixserversynczedcafeexport(
    device,
    player,
    exportfilestoguestfiles(files),
    removepaths,
  )
  return true
}

export function ensurezedcafeexportready(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): void {
  pushzedcafesynctoiframe(device, player, files)
}

function clearzedcafeexportsession() {
  stopzedcafepoll()
  clearlasthostpushdoc()
  setzedcafeguestdirty(false)
}

/** Drop in-flight export guesttree/poll work (hardreset remount). */
export function resetzedcafeexportinflight(): void {
  stopzedcafepoll()
  setpendingsync(null)
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

function markzedcafepollready(
  device: DEVICELIKE,
  player: string,
  hostpushdoc: Record<string, unknown>,
) {
  wanixserversetzedcafeready(device, player, true)
  startzedcafepoll(device, player)
  setlasthostpushdoc(hostpushdoc)
  flushpendingpollkick()
}

/**
 * Drop-pull answers export via iframe-local sync (no parent pendingsync).
 * Arm import poll from the host files we just handed the iframe.
 */
export function armzedcafepollfromhostfiles(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): void {
  const memcount = readbookcountfromexportfiles(files)
  if (memcount < 1) {
    return
  }
  if (readzedcafepollactive()) {
    setlasthostpushdoc(zedcafeexportfilestodoc(files))
    flushpendingpollkick()
    return
  }
  markzedcafepollready(device, player, zedcafeexportfilestodoc(files))
  tracezedcafeexport(
    `poll-arm host-pull memcount=${memcount} paths=${files.length}`,
  )
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
  bumpzedcafeguestdirtygen()
  setzedcafeguestdirty(true)
  try {
    const guestdoc = zedcafeexportfilestodoc(files)
    const shadow = readlasthostpushdoc()
    const shadowempty = Object.keys(shadow).length === 0
    const simdirty = readzedcafeexportpendingdirty()
    let result: WANIX_ZED_CAFE_IMPORT_RESULT
    if (shadowempty) {
      // Initial activation / empty shadow — full structural reconcile.
      result = await requestvmzedcafeimport(device, player, files)
    } else {
      const deltaops = compare(shadow, guestdoc)
      if (deltaops.length === 0) {
        // Guest matches last host push. Do not ack export dirty gens — unpushed
        // sim edits may still need a tick flush against this guest tree.
        acknowledgezedcafeguestdirtygen()
        setzedcafeguestdirty(false)
        wanixperfmark('export-import-noop', { paths: files.length })
        apilog(
          device,
          player,
          'zedcafe import: guest tree matched host shadow (no VM apply)',
        )
        return true
      }
      const upsertpaths = readzedcafeexportupsertpaths(deltaops)
      const removepaths = [...readzedcafeexportremovepaths(deltaops)]
      const filteredupsert = filterzedcafeexportpathsagainstsimdirty(
        upsertpaths,
        simdirty,
      )
      const filteredremove = filterzedcafeexportpathsagainstsimdirty(
        removepaths,
        simdirty,
      )
      if (
        filteredupsert.skipped.length > 0 ||
        filteredremove.skipped.length > 0
      ) {
        const skippedn =
          filteredupsert.skipped.length + filteredremove.skipped.length
        apilog(
          device,
          player,
          `zedcafe import: skipped ${skippedn} path(s) with unpushed sim dirty`,
        )
        wanixperfmark('export-import-skip-sim-dirty', {
          skipped: skippedn,
          keep:
            filteredupsert.keep.length + filteredremove.keep.length,
        })
      }
      if (
        filteredupsert.keep.length === 0 &&
        filteredremove.keep.length === 0
      ) {
        // Every guest delta collides with pending sim dirty — leave memory alone
        // and clear guest-dirty so the host tick can republish sim truth.
        acknowledgezedcafeguestdirtygen()
        setzedcafeguestdirty(false)
        wanixperfmark('export-import-noop', {
          paths: files.length,
          skippedall: true,
        })
        apilog(
          device,
          player,
          'zedcafe import: all guest deltas deferred to unpushed sim dirty',
        )
        return true
      }
      const keepupsert = new Set(filteredupsert.keep)
      const subset = zedcafeexportdoctofiles(guestdoc, keepupsert)
      const partialcheck = validatezedcafeexportpaths(subset, { partial: true })
      if (!partialcheck.ok) {
        const detail = partialcheck.errors[0] ?? 'unknown'
        apilog(device, player, `zedcafe import: invalid delta — ${detail}`)
        return false
      }
      result = await requestvmzedcafeimport(device, player, subset, {
        partial: true,
        removepaths: filteredremove.keep,
      })
    }
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
    const applieddoc = zedcafeexportfilestodoc(applied)
    const ops = compare(guestdoc, applieddoc)
    if (ops.length === 0) {
      setlasthostpushdoc(applieddoc)
      // Retain pending sim dirty — only ack guest side here.
      acknowledgezedcafeguestdirtygen()
      setzedcafeguestdirty(false)
      wanixperfmark('export-import-noop', { paths: files.length })
      return true
    }
    const upsertpaths = readzedcafeexportupsertpaths(ops)
    const subset = zedcafeexportdoctofiles(applieddoc, upsertpaths)
    // Upsert-only after import: defer host removes until guest-dirty clears so
    // concurrent zedsync flat-file writes are not racing export-tree deletes.
    const pushed = pushzedcafesynctoiframe(device, player, subset, {
      fromimport: true,
      partial: true,
      nextdoc: applieddoc,
      removepaths: [],
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
  const queued = readpendingpollkick()
  stopzedcafepoll()
  setpolldevice(device)
  setpollplayer(player)
  setzedcafepollactive(true)
  if (queued) {
    setpendingpollkick(true)
  }
}

export function stopzedcafepoll() {
  setpolldevice(null)
  setpollplayer('')
  setpendingpollphase(null)
  setpendingpollkick(false)
  setzedcafepollactive(false)
}

function flushpendingpollkick(): void {
  if (!readpendingpollkick()) {
    return
  }
  setpendingpollkick(false)
  kickzedcafepoll('queued')
}

function tickzedcafepoll() {
  const polldevice = readpolldevice()
  const phase = readpendingpollphase()
  if (!readzedcafepollactive() || !polldevice) {
    setpendingpollkick(true)
    tracezedcafeexport(
      `poll-kick-skip active=${readzedcafepollactive()} device=${!!polldevice} phase=${phase ?? 'none'}`,
    )
    return
  }
  if (phase) {
    setpendingpollkick(true)
    tracezedcafeexport(`poll-kick-skip phase=${phase}`)
    return
  }
  setpendingpollphase('taskrid')
  wanixserverreadzedcafetaskrid(polldevice, readpollplayer())
}

/** One-shot import poll tick (e.g. after guest-writer task session close). */
export function kickzedcafepoll(reason = 'manual', paths?: string[]): void {
  if (reason === 'file-change') {
    bumpzedcafeguestdirtygen()
    // Gate host tick flush immediately — gen alone used to leave a window
    // where checkzedcafeexportontick could push a pre-import snapshot.
    setzedcafeguestdirty(true)
    if (paths && paths.length > 0) {
      markpendingdirtypaths(paths)
    }
  }
  tracezedcafeexport(`poll-kick reason=${reason}`)
  tickzedcafepoll()
}

async function continuepollaftertree(
  device: DEVICELIKE,
  player: string,
  tree: WANIX_ZED_CAFE_EXPORT_FILE[],
): Promise<void> {
  // Drain dirty-path hints for tracing only -- never gate import on them.
  // Scoped compare skipped peer board/terrain when notify listed stats only.
  const scopepaths = drainpendingdirtypaths()
  if (scopepaths.length > 0) {
    wanixperfmark('export-import-paths', { count: scopepaths.length })
  }
  const differs = guestdiffersfromlastpush(tree)
  tracezedcafeexport(`poll-guest-diff=${differs}`)
  if (!differs) {
    return
  }
  if (!guesttreestatsready(tree)) {
    tracezedcafeexport('poll-skip guest-not-ready')
    return
  }
  try {
    await runzedcafeimport(device, player, tree)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    tracezedcafeexport(`poll-import-error ${detail}`)
    apilog(device, player, `zedcafe: import apply failed — ${detail}`)
  }
}

export function iswanixspaceactive(): boolean {
  return readwanixroomconfig().mode !== 'idle'
}

export function assertfindplayersexportready(
  device: DEVICELIKE,
  player: string,
): void {
  apilog(
    device,
    player,
    'findplayers: export readiness checked via emit chain — spawning scanner…',
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
  const ok = pushzedcafesynctoiframe(device, player, exportfiles)
  if (!ok && memcount > 0) {
    throw new Error('zedcafe export sync failed')
  }
}

export function wanixhandleexportstate(
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

  const importedguest = false
  // Guest tree pull continues via emit when needed; push host files now.
  if (readzedcafeguestdirty()) {
    tracezedcafeexport('handleexportstate skip-push guest-dirty')
    return
  }
  if (!importedguest) {
    pushzedcafesynctoiframe(device, player, files)
  }
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
  pushzedcafesynctoiframe(device, player, files)
}

/** Clear host export session when wanix room returns to idle. */
export function resetwanixzedcafeonidle() {
  clearwanixzedcafependingexport()
  setpendingsync(null)
  setpendingpollphase(null)
  setpendingpollkick(false)
  clearzedcafeexportsession()
}

/** Test hook — reset pending flag. */
export function resetwanixzedcafefortest() {
  const exportwait = readpendingexportwait()
  if (exportwait) {
    clearTimeout(exportwait.timer)
    exportwait.reject(new Error('zedcafe export: test reset'))
    setpendingexportwait(null)
  }
  const importwait = readpendingimportwait()
  if (importwait) {
    clearTimeout(importwait.timer)
    importwait.reject(new Error('zedcafe import: test reset'))
    setpendingimportwait(null)
  }
  clearpendingexportstate()
  setpendingsync(null)
  setpendingpollphase(null)
  setpendingpollkick(false)
  clearzedcafeexportsession()
}
