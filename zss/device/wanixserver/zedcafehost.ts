import {
  postwanixexportmessage,
  postzedcafefilechangemessage,
} from 'zss/device/wanixserver/exportevents'
import type {
  WanixRoot,
  WanixSystemElement,
  WanixVmElement,
} from 'zss/feature/wanix/wanixelements.d.ts'
import { wanixperfmark } from 'zss/feature/wanix/wanixperf'
import { readzedcafeexportstatscontentready } from 'zss/feature/wanix/wanixstateexport'
import {
  WANIX_ZEDCAFE_EXPORT_READY_POLL_MS,
  WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
  WANIX_ZEDCAFE_GUEST_MOUNT,
  WANIX_ZEDCAFE_TASK_ID,
  WANIX_ZEDCAFE_TASK_WASM,
  WANIX_ZEDCAFE_WASM_BUILD_STORAGE_KEY,
  WANIX_ZEDCAFE_WASM_RAMFS,
  WANIX_ZEDSYNC_REVISION_DIR,
  WANIX_ZEDSYNC_REVISION_FILE,
  readwanixzedcafeexportsrc,
  readwanixzedcafeguestpath,
  readwanixzedcafewasmurl,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import type { WanixZedCafeGuestFile } from 'zss/feature/wanix/wanixzedcafetypes'
import { WANIX_ZEDCAFE_WASM_BUILD_ID } from 'zss/feature/wanix/wanixzedcafewasmversion'
import {
  isallowedexportpath,
  kebabcasezedcafedirname,
} from 'zss/feature/wanix/zedcafetreeschema'

type WanixTaskElement = HTMLElement & {
  rid?: string | null
  root?: WanixRoot
  /** Task NS handle — required for VM/guest binds (not `root`, which is kernel). */
  taskRoot?: WanixRoot
  allocate?: () => Promise<void>
  start?: () => Promise<void>
}

type WanixVmWithTask = WanixVmElement & {
  task: WanixTaskElement
}

let zedcafegen = 0
let zedcafecmd = ''
let zedcafetaskrid: string | null = null
let zedcafeready = false
let zedcafebootgen = 0
let zedcafebootpromise: Promise<string | null> | null = null
let hostpushinflight = false
let hostpushgen = 0
/** Monotonic export revision, bumped after each successful host push. */
let zedcafeexportrevision = 0
/** Longer than Go `exportdirtydebounce` (50ms) so host-push dirties settle before kicks. */
const HOST_PUSH_DIRTY_SUPPRESS_MS = 75

/** Generic gojs->host bridge hook signature (worker.go forwards taskid + data). */
type GojsWorkerMessageHook = (taskid: string, data: unknown) => void
/** Legacy zedcafe-specific hook signature (pre-generic-bridge worker.go). */
type ZedcafeDirtyHook = (taskrid?: string) => void

function readglobalgojsbridgehook(): GojsWorkerMessageHook | undefined {
  return (globalThis as { __wanixOnGojsWorkerMessage?: GojsWorkerMessageHook })
    .__wanixOnGojsWorkerMessage
}

function setglobalgojsbridgehook(
  hook: GojsWorkerMessageHook | undefined,
): void {
  ;(
    globalThis as { __wanixOnGojsWorkerMessage?: GojsWorkerMessageHook }
  ).__wanixOnGojsWorkerMessage = hook
}

function readglobaldirtyhook(): ZedcafeDirtyHook | undefined {
  return (globalThis as { __wanixOnZedcafeExportDirty?: ZedcafeDirtyHook })
    .__wanixOnZedcafeExportDirty
}

function setglobaldirtyhook(hook: ZedcafeDirtyHook | undefined): void {
  ;(
    globalThis as { __wanixOnZedcafeExportDirty?: ZedcafeDirtyHook }
  ).__wanixOnZedcafeExportDirty = hook
}

function readdirtymessagepaths(data: unknown): string[] | undefined {
  if (!data || typeof data !== 'object') {
    return undefined
  }
  const paths = (data as { paths?: unknown }).paths
  if (!Array.isArray(paths)) {
    return undefined
  }
  return paths.filter((path): path is string => typeof path === 'string')
}

function handlezedcafedirtynotify(taskrid?: string, paths?: string[]): void {
  if (hostpushinflight) {
    return
  }
  if (taskrid && zedcafetaskrid && taskrid !== zedcafetaskrid) {
    return
  }
  postzedcafefilechangemessage(taskrid ?? zedcafetaskrid ?? undefined, paths)
}

function registerzedcafedirtyhook(): void {
  setglobalgojsbridgehook((taskid: string, data: unknown) => {
    if (!data || typeof data !== 'object') {
      return
    }
    if (!(data as { zedcafeexportdirty?: unknown }).zedcafeexportdirty) {
      return
    }
    handlezedcafedirtynotify(taskid, readdirtymessagepaths(data))
  })
  // Backward compat: older worker.go checkouts (or tests) that only invoke
  // the legacy zedcafe-specific hook without the generic bridge.
  setglobaldirtyhook((taskrid?: string) => {
    handlezedcafedirtynotify(taskrid)
  })
}

function clearzedcafedirtyhook(): void {
  if (readglobalgojsbridgehook()) {
    setglobalgojsbridgehook(undefined)
  }
  if (readglobaldirtyhook()) {
    setglobaldirtyhook(undefined)
  }
}

function setwanixattrs(el: HTMLElement, attrs: Record<string, unknown>) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) {
      el.removeAttribute(key)
      continue
    }
    if (value === true || value === '') {
      el.setAttribute(key, '')
      continue
    }
    el.setAttribute(key, String(value as string | number))
  }
}

function createbind(attrs: Record<string, unknown>, marker?: string) {
  const bind = document.createElement('wanix-bind')
  setwanixattrs(bind, attrs)
  if (marker) {
    bind.setAttribute(marker, '')
  }
  return bind
}

async function tryunbindexport(
  handle: WanixRoot,
  src: string,
  dst: string,
): Promise<void> {
  try {
    await handle.unbind(src, dst)
  } catch {
    // dst may not be bound yet
  }
}

export function resetzedcafestate() {
  zedcafegen = 0
  zedcafecmd = ''
  zedcafetaskrid = null
  zedcafeready = false
  zedcafebootgen = 0
  zedcafebootpromise = null
}

function readtaskrid(task: Element | null): string | null {
  if (!task) {
    return null
  }
  return (task as WanixTaskElement).rid ?? null
}

export function readzedcafetaskridlocal(
  sys?: WanixSystemElement | null,
): string | null {
  if (zedcafetaskrid) {
    return zedcafetaskrid
  }
  if (!sys) {
    return null
  }
  const rid = readtaskrid(
    sys.querySelector(`wanix-task[id="${WANIX_ZEDCAFE_TASK_ID}"]`),
  )
  if (rid) {
    zedcafetaskrid = rid
  }
  return rid
}

function readbookstatspathsfromstatsbytes(
  bytes: Uint8Array,
): { bookcount: number; bookstatspaths: string[] } | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
      bookCount?: unknown
      books?: { id: string; name?: string }[]
    }
    const bookcount =
      typeof parsed.bookCount === 'number' ? parsed.bookCount : -1
    const bookrefs = parsed.books ?? []
    const bookstatspaths: string[] = []
    for (let i = 0; i < bookrefs.length; ++i) {
      const bookref = bookrefs[i]
      bookstatspaths.push(
        `${kebabcasezedcafedirname(bookref.name, bookref.id)}/stats.json`,
      )
    }
    return { bookcount, bookstatspaths }
  } catch {
    return null
  }
}

async function readbookstatsreadyatbase(
  root: WanixRoot,
  base: string,
  bookstatspaths: string[],
): Promise<boolean> {
  for (let i = 0; i < bookstatspaths.length; ++i) {
    try {
      await root.readFile(`${base}/${bookstatspaths[i]}`)
    } catch {
      return false
    }
  }
  return bookstatspaths.length > 0
}

export function synczedcafestate(cmd: string, generation: number) {
  zedcafecmd = cmd
  zedcafegen = generation
  zedcafeready = false
  zedcafebootpromise = null
}

export function setzedcafereadylocal(ready: boolean) {
  zedcafeready = ready
}

const WANIX_ZEDCAFE_WASM_UPDATED_LOG =
  '[wanix] zedcafe.wasm updated — restarted export task'

export function synczedcafewasmversionifneeded(
  sys: WanixSystemElement | null,
): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false
  }
  const stored = sessionStorage.getItem(WANIX_ZEDCAFE_WASM_BUILD_STORAGE_KEY)
  if (stored === WANIX_ZEDCAFE_WASM_BUILD_ID) {
    return false
  }
  if (sys) {
    haltzedcafetask(sys)
  }
  resetzedcafestate()
  sessionStorage.setItem(
    WANIX_ZEDCAFE_WASM_BUILD_STORAGE_KEY,
    WANIX_ZEDCAFE_WASM_BUILD_ID,
  )
  if (stored) {
    console.info(WANIX_ZEDCAFE_WASM_UPDATED_LOG)
  }
  return true
}

function appendzedcafewasmbind(task: WanixTaskElement) {
  if (task.querySelector('wanix-bind[data-zss-zedcafe-wasm]')) {
    return
  }
  const bind = createbind(
    {
      type: 'file',
      dst: WANIX_ZEDCAFE_TASK_WASM,
      src: readwanixzedcafewasmurl(),
    },
    'data-zss-zedcafe-wasm',
  )
  task.appendChild(bind)
}

function appendgojstask(
  sys: WanixSystemElement,
  cmd: string,
): WanixTaskElement {
  sys.querySelector(`wanix-task[id="${WANIX_ZEDCAFE_TASK_ID}"]`)?.remove()
  const task = document.createElement('wanix-task') as WanixTaskElement
  setwanixattrs(task, {
    id: WANIX_ZEDCAFE_TASK_ID,
    type: 'gojs',
    cmd,
  })
  task.setAttribute('data-zss-target-id', WANIX_ZEDCAFE_TASK_ID)
  sys.appendChild(task)
  return task
}

type WanixTaskConnect = WanixTaskElement & {
  _kernel?: unknown
  _nsReady?: Promise<void>
}

/**
 * WanixElement queues `_connect` on a microtask. Calling `allocate()` in the
 * same turn hits `_kernel.root` while `_kernel` is still null.
 * Prefer awaiting `_nsReady` (runs `_awake` → `allocate`).
 */
async function waitwanixtaskallocated(task: WanixTaskElement): Promise<void> {
  const connected = task as WanixTaskConnect
  if (connected.rid) {
    return
  }
  if (connected._nsReady) {
    await connected._nsReady
    if (connected.rid) {
      return
    }
  } else {
    await Promise.resolve()
  }
  if (connected.rid) {
    return
  }
  if (typeof task.allocate === 'function') {
    await task.allocate()
  }
  if (!connected.rid) {
    throw new Error('wanix-task allocate missing rid')
  }
}

export async function readzedcafeexportlive(
  root: WanixRoot,
  taskrid: string,
): Promise<boolean> {
  if (!taskrid) {
    return false
  }
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  return readzedcafeexportstatsready(root, exportsrc)
}

async function readzedcafeguestboundatroot(root: WanixRoot): Promise<boolean> {
  const statspath = readwanixzedcafeguestpath('stats.json')
  try {
    const raw = await root.readFile(statspath)
    const bytes =
      raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw))
    if (!readzedcafeexportstatscontentready(bytes)) {
      return false
    }
    try {
      const meta = readbookstatspathsfromstatsbytes(bytes)
      if (!meta) {
        return false
      }
      if (meta.bookcount > 0) {
        return readbookstatsreadyatbase(
          root,
          WANIX_ZEDCAFE_GUEST_MOUNT,
          meta.bookstatspaths,
        )
      }
    } catch {
      return false
    }
    return true
  } catch {
    return false
  }
}

export function appendguestexportbind(
  task: HTMLElement,
  taskrid: string,
  tag = 'data-zss-guest-export',
) {
  if (task.querySelector(`wanix-bind[${tag}]`)) {
    return
  }
  const bind = createbind(
    {
      dst: WANIX_ZEDCAFE_GUEST_MOUNT,
      src: readwanixzedcafeexportsrc(taskrid),
    },
    tag,
  )
  task.appendChild(bind)
}

export async function readzedcafeguestbound(
  root: WanixRoot,
  sys?: WanixSystemElement | null,
): Promise<boolean> {
  if (await readzedcafeguestboundatroot(root)) {
    return true
  }
  const vm = sys?.querySelector('wanix-vm') as WanixVmWithTask | null
  const vmtask = vm?.task
  if (
    vmtask?.taskRoot &&
    (await readzedcafeguestboundatroot(vmtask.taskRoot))
  ) {
    return true
  }
  if (!sys) {
    return false
  }
  const tasks = sys.querySelectorAll(
    `wanix-task[type="gojs"]:not([id="${WANIX_ZEDCAFE_TASK_ID}"])`,
  )
  for (let i = 0; i < tasks.length; ++i) {
    const el = tasks[i] as WanixTaskElement
    if (el.taskRoot && (await readzedcafeguestboundatroot(el.taskRoot))) {
      return true
    }
  }
  return false
}

async function readzedcafeexportmountready(
  root: WanixRoot,
  taskrid: string,
): Promise<boolean> {
  try {
    const entries = await root.readDir(`#task/${taskrid}`)
    return entries.some((entry) => entry.replace(/\/$/, '') === 'export')
  } catch {
    return false
  }
}

async function readzedcafeexportstatsready(
  root: WanixRoot,
  base: string,
): Promise<boolean> {
  try {
    const raw = await root.readFile(`${base}/stats.json`)
    const bytes =
      raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw))
    return readzedcafeexportstatscontentready(bytes)
  } catch {
    return false
  }
}

export async function readzedcafeexportcontentready(
  root: WanixRoot,
  base: string,
): Promise<boolean> {
  return readzedcafeexportstatsready(root, base)
}

export async function waitzedcafeexportmountready(
  root: WanixRoot,
  taskrid: string,
  timeoutms = WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
): Promise<boolean> {
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    if (await readzedcafeexportmountready(root, taskrid)) {
      return true
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZEDCAFE_EXPORT_READY_POLL_MS),
    )
  }
  return false
}

export async function waitzedcafeexportcontentready(
  root: WanixRoot,
  taskrid: string,
  timeoutms = WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
): Promise<boolean> {
  const exportsrc = readwanixzedcafeexportsrc(taskrid)
  if (timeoutms <= 0) {
    return readzedcafeexportstatsready(root, exportsrc)
  }
  if (zedcafeready && (await readzedcafeexportstatsready(root, exportsrc))) {
    return true
  }
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    if (await readzedcafeexportstatsready(root, exportsrc)) {
      return true
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZEDCAFE_EXPORT_READY_POLL_MS),
    )
  }
  return false
}

async function waitvmtaskroot(
  sys: WanixSystemElement,
  timeoutms = WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
): Promise<WanixRoot | null> {
  const vm = sys.querySelector('wanix-vm') as WanixVmWithTask | null
  if (!vm) {
    return null
  }
  // Prefer taskRoot: TaskElement.root is the kernel root (WanixElement), so
  // binding there never reaches the Linux virtfs namespace.
  if (vm.task?.taskRoot) {
    return vm.task.taskRoot
  }
  // Allocated without taskRoot cannot be fixed by waiting.
  if (vm.task?.rid) {
    return null
  }
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZEDCAFE_EXPORT_READY_POLL_MS),
    )
    const current = sys.querySelector('wanix-vm') as WanixVmWithTask | null
    if (current?.task?.taskRoot) {
      return current.task.taskRoot
    }
    if (current?.task?.rid) {
      return null
    }
  }
  return null
}

export async function wireallguestroots(
  sys: WanixSystemElement,
  taskrid: string,
): Promise<number> {
  const src = readwanixzedcafeexportsrc(taskrid)
  const dst = WANIX_ZEDCAFE_GUEST_MOUNT
  await tryunbindexport(sys.root, src, dst)
  await sys.root.bind(src, dst)
  let count = 1
  const vmroot = await waitvmtaskroot(sys)
  if (vmroot) {
    await tryunbindexport(vmroot, src, dst)
    await vmroot.bind(src, dst)
    count++
    wanixperfmark('zedcafe-guest-bind-vm', { taskrid, dst })
  } else if (sys.querySelector('wanix-vm')) {
    console.error(
      '[zedcafe-export] vm present but taskRoot missing -- /zedcafe not bound into linux',
    )
  }
  const tasks = sys.querySelectorAll(
    `wanix-task[type="gojs"]:not([id="${WANIX_ZEDCAFE_TASK_ID}"])`,
  )
  for (let i = 0; i < tasks.length; ++i) {
    appendguestexportbind(tasks[i] as HTMLElement, taskrid)
    count++
  }
  return count
}

async function collectexporttreefiles(
  root: WanixRoot,
  base: string,
): Promise<WanixZedCafeGuestFile[]> {
  const files: WanixZedCafeGuestFile[] = []

  // Leaf export files are always `*.json`. Directory segments may contain `.`
  // inside legacy page/book ids (e.g. `key-sid_8FzEX.FvcYV1`) — those must be
  // walked. New ids from createsid() are underscore-safe only.
  function isleafpath(rel: string): boolean {
    const name = rel.split('/').pop() ?? rel
    return name.endsWith('.json')
  }

  async function ingest(rel: string) {
    const path = rel ? `${base}/${rel}` : base
    if (rel && isleafpath(rel)) {
      try {
        const raw = await root.readFile(path)
        const bytes =
          raw instanceof Uint8Array
            ? raw
            : new TextEncoder().encode(String(raw))
        files.push({ path: rel, data: bytes })
      } catch {
        // skip missing leaf
      }
      return
    }
    let entries: string[] | null = null
    try {
      entries = await root.readDir(path)
    } catch {
      entries = null
    }
    if (entries === null) {
      try {
        const raw = await root.readFile(path)
        const bytes =
          raw instanceof Uint8Array
            ? raw
            : new TextEncoder().encode(String(raw))
        files.push({ path: rel, data: bytes })
      } catch {
        // skip missing path
      }
      return
    }
    for (const entry of entries) {
      const name = entry.replace(/\/$/, '')
      // Meta dirs (e.g. WANIX_ZEDSYNC_REVISION_DIR) live alongside the export
      // tree but are not part of the zedcafe JSON document — mirrors Go
      // zedsync's shouldskip (dot-prefixed path segments).
      if (name.startsWith('.')) {
        continue
      }
      const childrel = rel ? `${rel}/${name}` : name
      await ingest(childrel)
    }
  }

  await ingest('')
  return files
}

export async function collectzedcafeexportfiles(
  root: WanixRoot,
  taskrid: string,
): Promise<WanixZedCafeGuestFile[]> {
  return collectexporttreefiles(root, readwanixzedcafeexportsrc(taskrid))
}

export function readguestfilebookcount(files: WanixZedCafeGuestFile[]): number {
  const stats = files.find((file) => file.path === 'stats.json')
  if (!stats) {
    return -1
  }
  try {
    const bytes =
      stats.data instanceof Uint8Array
        ? stats.data
        : new Uint8Array(stats.data as ArrayLike<number>)
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
      bookCount?: unknown
    }
    return typeof parsed.bookCount === 'number' ? parsed.bookCount : -1
  } catch {
    return -1
  }
}

export async function removezedcafeexportpaths(
  root: WanixRoot,
  taskrid: string,
  removepaths: string[],
): Promise<number> {
  const base = readwanixzedcafeexportsrc(taskrid)
  let removed = 0
  for (let i = 0; i < removepaths.length; ++i) {
    const relpath = removepaths[i]
    if (!isallowedexportpath(relpath)) {
      console.error(
        `[zedcafe-export] skip remove: path outside schema: ${relpath}`,
      )
      continue
    }
    const full = `${base}/${relpath}`
    try {
      await root.remove(full)
      removed += 1
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      // Missing path is fine — guest may already lack the orphan.
      // Directory-not-empty is a benign prune race while zedsync writes peers.
      if (
        !/not exist|no such|enoent|not found|directory not empty|enotempty|not empty/i.test(
          detail,
        )
      ) {
        console.error(`[zedcafe-export] remove failed ${relpath}: ${detail}`)
      }
    }
  }
  return removed
}

/** Bounded-concurrency pool: run `worker` over `items`, at most `limit` in flight. */
async function runwithconcurrencylimit<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0
  async function runnext(): Promise<void> {
    for (;;) {
      const index = cursor++
      if (index >= items.length) {
        return
      }
      await worker(items[index])
    }
  }
  const runnercount = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: runnercount }, () => runnext()))
}

const PUSH_WRITE_CONCURRENCY = 8

/**
 * Peer-visible dirty hint: bumps the export revision and records which
 * export-relative paths this push touched, so zedsync's incremental tick
 * (Go `ReadRevision` / `SteadyTickIncremental`) can sync just those paths
 * instead of walking the whole zedcafe export tree.
 */
async function writezedcafeexportrevision(
  root: WanixRoot,
  base: string,
  paths: string[],
): Promise<void> {
  zedcafeexportrevision += 1
  const revision = zedcafeexportrevision
  const payload = new TextEncoder().encode(
    `${JSON.stringify({ revision, paths })}\n`,
  )
  try {
    try {
      await root.makeDirAll(`${base}/${WANIX_ZEDSYNC_REVISION_DIR}`)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      if (!/file already exists|already exists|EEXIST/i.test(detail)) {
        throw err
      }
    }
    await root.writeFile(`${base}/${WANIX_ZEDSYNC_REVISION_FILE}`, payload)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error(`[zedcafe-export] revision write failed: ${detail}`)
  }
  wanixperfmark('zedsync-delta-end', { revision, paths: paths.length })
}

export async function pushzedcafeexportlive(
  root: WanixRoot,
  taskrid: string,
  files: WanixZedCafeGuestFile[],
  removepaths: string[] = [],
) {
  hostpushinflight = true
  const pushgen = ++hostpushgen
  try {
    const base = readwanixzedcafeexportsrc(taskrid)
    if (removepaths.length > 0) {
      await removezedcafeexportpaths(root, taskrid, removepaths)
    }
    const sorted = [...files].sort((a, b) => {
      if (a.path === 'stats.json') {
        return 1
      }
      if (b.path === 'stats.json') {
        return -1
      }
      return a.path.localeCompare(b.path)
    })
    // Export writes cross the p9 client, which walks parent dirs before Create.
    // Create all parent dirs first, shallowest-first and sequential -- concurrent
    // makeDirAll on nested parents (board vs board/objects) races the p9 walk
    // ("walk .../object: file does not exist"). File bytes may still write in
    // parallel once dirs exist.
    const PUSH_PROGRESS_EVERY = 100
    const pushtotal = sorted.length
    const pushstart = Date.now()
    const madedirs = new Set<string>()
    let writtencount = 0

    const isdiralreadyexists = (err: unknown): boolean => {
      const detail = err instanceof Error ? err.message : String(err)
      return /file already exists|already exists|EEXIST/i.test(detail)
    }

    const collectparentdirs = (paths: string[]): string[] => {
      const parents = new Set<string>()
      for (let i = 0; i < paths.length; ++i) {
        const full = `${base}/${paths[i]}`
        let parentdir = full.slice(0, full.lastIndexOf('/'))
        while (parentdir.length > base.length) {
          parents.add(parentdir)
          parentdir = parentdir.slice(0, parentdir.lastIndexOf('/'))
        }
      }
      return [...parents].sort((a, b) => {
        const adepth = a.split('/').length
        const bdepth = b.split('/').length
        if (adepth !== bdepth) {
          return adepth - bdepth
        }
        return a.localeCompare(b)
      })
    }

    const materializeparentdirs = async (paths: string[]): Promise<void> => {
      const parents = collectparentdirs(paths)
      for (let i = 0; i < parents.length; ++i) {
        const parentdir = parents[i]
        if (madedirs.has(parentdir)) {
          continue
        }
        try {
          await root.makeDirAll(parentdir)
        } catch (err) {
          if (!isdiralreadyexists(err)) {
            throw err
          }
        }
        madedirs.add(parentdir)
      }
    }

    const writeexportfile = async (
      file: WanixZedCafeGuestFile,
    ): Promise<void> => {
      const full = `${base}/${file.path}`
      await root.writeFile(
        full,
        file.data instanceof Uint8Array
          ? file.data
          : new Uint8Array(file.data as ArrayLike<number>),
      )
      writtencount += 1
      if (
        writtencount === pushtotal ||
        (pushtotal >= PUSH_PROGRESS_EVERY &&
          writtencount % PUSH_PROGRESS_EVERY === 0)
      ) {
        wanixperfmark('export-push-progress', {
          taskrid,
          written: writtencount,
          total: pushtotal,
          parents: madedirs.size,
          elapsedms: Date.now() - pushstart,
        })
      }
    }

    // stats.json is the guest's content-ready signal — always land it last,
    // after every other upsert in this push has settled.
    const statsfile = sorted.find((file) => file.path === 'stats.json')
    const upsertfiles = sorted.filter((file) => file.path !== 'stats.json')
    await materializeparentdirs(upsertfiles.map((file) => file.path))
    await runwithconcurrencylimit(
      upsertfiles,
      PUSH_WRITE_CONCURRENCY,
      writeexportfile,
    )
    if (statsfile) {
      await writeexportfile(statsfile)
    }
    const bookcount = readguestfilebookcount(sorted)
    if (bookcount > 0) {
      const statsfile = sorted.find((file) => file.path === 'stats.json')
      const meta = statsfile
        ? readbookstatspathsfromstatsbytes(
            statsfile.data instanceof Uint8Array
              ? statsfile.data
              : new Uint8Array(statsfile.data as ArrayLike<number>),
          )
        : null
      const missing =
        !meta ||
        meta.bookstatspaths.length === 0 ||
        meta.bookstatspaths.some(
          (bookpath) => !sorted.some((file) => file.path === bookpath),
        )
      if (missing) {
        console.error(
          `[zedcafe-export] push verify failed: bookCount=${bookcount} but book stats missing after push (${sorted.length} files)`,
        )
        throw new Error(
          `zedcafe export incomplete: bookCount=${bookcount} but book stats missing after push (${sorted.length} files)`,
        )
      }
    }
    // Removals-only: still signal content-ready so parent waiters unblock.
    if (sorted.length > 0 || removepaths.length > 0) {
      await writezedcafeexportrevision(root, base, [
        ...removepaths,
        ...sorted.map((file) => file.path),
      ])
      postwanixexportmessage('content-ready', taskrid)
    }
    if (sorted.length > 0 || bookcount > 0) {
      setzedcafereadylocal(true)
    }
    wanixperfmark('export-push-end', {
      taskrid,
      bookcount,
      paths: sorted.length,
      removed: removepaths.length,
      parents: madedirs.size,
      elapsedms: Date.now() - pushstart,
      bytes: sorted.reduce(
        (sum, file) =>
          sum +
          (file.data instanceof Uint8Array
            ? file.data.byteLength
            : (file.data as ArrayLike<number>).length),
        0,
      ),
    })
  } finally {
    // Hold suppress until Go dirty debounce from these writes can no longer fire.
    setTimeout(() => {
      if (pushgen === hostpushgen) {
        hostpushinflight = false
      }
    }, HOST_PUSH_DIRTY_SUPPRESS_MS)
  }
}

export function haltzedcafetask(sys: WanixSystemElement) {
  clearzedcafedirtyhook()
  const task = sys.querySelector(`wanix-task[id="${WANIX_ZEDCAFE_TASK_ID}"]`)
  if (task) {
    task
      .querySelectorAll('wanix-bind[data-zss-zedcafe-wasm]')
      .forEach((el) => el.remove())
    task.remove()
  }
  zedcafetaskrid = null
  zedcafeready = false
}

async function scrubzedcafestaging(
  task: WanixTaskElement,
  _sys: WanixSystemElement,
  root: WanixRoot,
) {
  task
    .querySelectorAll('wanix-bind[data-zss-zedcafe-wasm]')
    .forEach((el) => el.remove())

  try {
    await root.writeFile(WANIX_ZEDCAFE_WASM_RAMFS, new Uint8Array())
  } catch {
    // staging path may never have been written
  }
}

export async function bootzedcafegojs(
  sys: WanixSystemElement,
  root: WanixRoot,
  cmd: string,
): Promise<string | null> {
  const launchgen = zedcafegen

  const task = appendgojstask(sys, cmd)
  appendzedcafewasmbind(task)

  await waitwanixtaskallocated(task)
  if (launchgen !== zedcafegen) {
    return null
  }
  const taskrid = task.rid ?? null
  if (!taskrid) {
    throw new Error('zedcafe export: gojs allocate missing rid')
  }
  zedcafetaskrid = taskrid
  await task.start?.()
  if (launchgen !== zedcafegen) {
    return null
  }

  // Bound wait — a stuck gojs export handshake must not block applyroom / remotes.
  const ZEDCAFE_EXPORT_MOUNT_BOOT_MS = 15_000
  const mountready = await waitzedcafeexportmountready(
    root,
    taskrid,
    ZEDCAFE_EXPORT_MOUNT_BOOT_MS,
  )
  if (!mountready) {
    console.error(
      '[wanix] zedcafe export mount not ready within boot budget — task left running',
    )
    return null
  }

  registerzedcafedirtyhook()
  await scrubzedcafestaging(task, sys, root)
  return taskrid
}

export async function ensurezedcafeboot(
  sys: WanixSystemElement,
  root: WanixRoot,
  cmd: string,
): Promise<string | null> {
  synczedcafewasmversionifneeded(sys)
  const existing = sys.querySelector(
    `wanix-task[id="${WANIX_ZEDCAFE_TASK_ID}"]`,
  )
  // Remount replaces <wanix-namespace> but module state can keep a stale rid. Never
  // treat export as ready unless this sys still has wanix-task#zedcafe.
  if (!existing) {
    zedcafetaskrid = null
    zedcafebootpromise = null
  } else {
    const rid = (existing as WanixTaskElement).rid ?? zedcafetaskrid
    if (rid && (zedcafecmd === cmd || !zedcafecmd)) {
      // Bound wait — same budget as cold boot. Do not park drop/applyroom for
      // WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS when export never appears.
      const ZEDCAFE_EXPORT_MOUNT_BOOT_MS = 15_000
      const mountready = await waitzedcafeexportmountready(
        root,
        rid,
        ZEDCAFE_EXPORT_MOUNT_BOOT_MS,
      )
      if (mountready) {
        zedcafetaskrid = rid
        zedcafecmd = cmd
        registerzedcafedirtyhook()
        return rid
      }
    }
  }
  if (zedcafebootpromise && zedcafebootgen === zedcafegen) {
    return zedcafebootpromise
  }
  zedcafebootgen = zedcafegen
  zedcafebootpromise = bootzedcafegojs(sys, root, cmd).finally(() => {
    if (zedcafebootgen === zedcafegen) {
      zedcafebootpromise = null
    }
  })
  return zedcafebootpromise
}

export async function waitzedcafereadyrpc(
  _sys: WanixSystemElement,
  _root: WanixRoot,
  timeoutms: number,
): Promise<string | null> {
  if (!zedcafecmd) {
    return null
  }
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    if (zedcafetaskrid && zedcafeready) {
      return zedcafetaskrid
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZEDCAFE_EXPORT_READY_POLL_MS),
    )
  }
  return zedcafetaskrid && zedcafeready ? zedcafetaskrid : null
}
