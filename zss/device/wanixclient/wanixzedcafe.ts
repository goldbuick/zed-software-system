import type { DEVICELIKE, WANIX_ZED_CAFE_IMPORT_RESULT } from 'zss/device/api'
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
import {
  type PushZedCafeSyncOptions,
  clearlasthostpushdoc,
  clearwanixzedcafependingexport as clearpendingexportstate,
  markwanixzedcafependingexport as markpendingexportstate,
  readlasthostpushdoc,
  readwanixzedcafependingexport as readpendingexportstate,
  readpendingexportwait,
  readpendingimportwait,
  readpendingpollphase,
  readpendingsync,
  readpolldevice,
  readpollplayer,
  readpolltimer,
  readzedcafeguestdirty,
  readzedcafepollactive,
  setlasthostpushdoc,
  setpendingexportwait,
  setpendingimportwait,
  setpendingpollphase,
  setpendingsync,
  setpolldevice,
  setpollplayer,
  setpolltimer,
  setzedcafeguestdirty,
  setzedcafepollactive,
} from 'zss/device/wanixclient/state'
import { readwanixroomconfig } from 'zss/device/wanixclient/wanixroom'
import {
  wanixperfdelta,
  wanixperfmark,
  wanixperfnow,
} from 'zss/feature/wanix/wanixperf'
import {
  type WANIX_ZED_CAFE_EXPORT_FILE,
  buildzedcafeexportfiles,
  readbookcountfromexportfiles,
  readzedcafeexportstatscontentready,
  zedcafeexportdocsdiffer,
  zedcafeexportfilestodoc,
} from 'zss/feature/wanix/wanixstateexport'
import {
  WANIX_VM_ZEDCAFE_EXPORT_FETCH_MS,
  WANIX_VM_ZEDCAFE_IMPORT_MS,
  WANIX_ZEDCAFE_IMPORT_POLL_MS,
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
    out.push({
      path: file.path,
      bytes: new Uint8Array(file.data),
    })
  }
  return out
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
  if (readpendingexportwait()) {
    return Promise.reject(
      new Error('zedcafe export: concurrent vm export fetch'),
    )
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      setpendingexportwait(null)
      reject(new Error('zedcafe export: vm export fetch timed out'))
    }, timeoutms)
    setpendingexportwait({ resolve, reject, timer })
    vmexportzedcafe(device, player)
  })
}

function requestvmzedcafeimport(
  device: DEVICELIKE,
  player: string,
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
  timeoutms = WANIX_VM_ZEDCAFE_IMPORT_MS,
): Promise<WANIX_ZED_CAFE_IMPORT_RESULT> {
  if (readpendingimportwait()) {
    return Promise.reject(new Error('zedcafe import: concurrent vm import'))
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      setpendingimportwait(null)
      reject(new Error('zedcafe import: vm import timed out'))
    }, timeoutms)
    setpendingimportwait({ resolve, reject, timer })
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
  if (readpendingsync()?.phase === 'guesttree') {
    void continuepushafterguesttree(device, player, files)
    return
  }
  if (readpendingpollphase() === 'tree' && readpolldevice()) {
    setpendingpollphase(null)
    void continuepollaftertree(device, player, files)
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
  if (
    memcount > 0 ||
    (options?.partial && Object.keys(shadowdoc).length > 0) ||
    removepaths.length > 0
  ) {
    const taskrid = result.taskrid ?? null
    if (
      taskrid &&
      (memcount > 0 || files.some((file) => file.path === 'stats.json'))
    ) {
      setpendingsync({ ...ctx, phase: 'contentready', taskrid })
      return
    }
    if (!readzedcafepollactive() && memcount > 0) {
      markzedcafepollready(device, player, shadowdoc)
    } else {
      setlasthostpushdoc(shadowdoc)
    }
  } else {
    setlasthostpushdoc(shadowdoc)
  }
  setpendingsync(null)
  tracezedcafeexport(
    `sync-to-iframe memcount=${memcount} paths=${files.length} removed=${removepaths.length} taskrid=${result.taskrid ?? 'none'} partial=${!!options?.partial}`,
  )
}

export function handlewanixexportready(
  device: DEVICELIKE,
  player: string,
  taskrid: string,
  event?: string,
): void {
  if (event && event !== 'content-ready') {
    return
  }
  const pendingsync = readpendingsync()
  if (pendingsync?.phase !== 'contentready') {
    return
  }
  if (pendingsync.taskrid && pendingsync.taskrid !== taskrid) {
    return
  }
  const ctx = pendingsync
  setpendingsync(null)
  if (!readzedcafepollactive() && ctx.memcount > 0) {
    markzedcafepollready(device, player, ctx.shadowdoc)
  } else {
    setlasthostpushdoc(ctx.shadowdoc)
  }
  tracezedcafeexport(
    `sync-to-iframe content-ready memcount=${ctx.memcount} taskrid=${taskrid}`,
  )
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
  try {
    if (guestdiffersfromlastpush(guesttree)) {
      const imported = await runzedcafeimport(device, player, guesttree)
      if (imported) {
        setpendingsync(null)
        return
      }
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    tracezedcafeexport(`sync-guest-import-skip ${detail}`)
  }
  if (readzedcafeguestdirty()) {
    setpendingsync(null)
    tracezedcafeexport(
      `sync-skip guest-dirty-after-import memcount=${readbookcountfromexportfiles(files)}`,
    )
    return
  }
  let removepaths = options?.removepaths ?? []
  if (!options?.partial) {
    const orphans = readorphanremovepaths(guesttree, files)
    if (orphans.length > 0) {
      removepaths = [...new Set([...removepaths, ...orphans])]
    }
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
    setpendingsync({
      device,
      player,
      files,
      options,
      shadowdoc: options?.nextdoc ?? zedcafeexportfilestodoc(files),
      memcount: readbookcountfromexportfiles(files),
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
    const pushed = pushzedcafesynctoiframe(device, player, applied, {
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
  setpolldevice(device)
  setpollplayer(player)
  setzedcafepollactive(true)
  setpolltimer(
    setInterval(() => {
      tickzedcafepoll()
    }, WANIX_ZEDCAFE_IMPORT_POLL_MS),
  )
}

export function stopzedcafepoll() {
  const polltimer = readpolltimer()
  if (polltimer) {
    clearInterval(polltimer)
    setpolltimer(undefined)
  }
  setpolldevice(null)
  setpollplayer('')
  setpendingpollphase(null)
  setzedcafepollactive(false)
}

function tickzedcafepoll() {
  const polldevice = readpolldevice()
  if (!readzedcafepollactive() || !polldevice || readpendingpollphase()) {
    return
  }
  setpendingpollphase('taskrid')
  wanixserverreadzedcafetaskrid(polldevice, readpollplayer())
}

async function continuepollaftertree(
  device: DEVICELIKE,
  player: string,
  tree: WANIX_ZED_CAFE_EXPORT_FILE[],
): Promise<void> {
  if (!guestdiffersfromlastpush(tree)) {
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
  clearzedcafeexportsession()
}
