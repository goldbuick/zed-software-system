import { postwanixexportmessage } from 'zss/feature/wanix/wanixexportevents'
import { wanixperfmark } from 'zss/feature/wanix/wanixperf'
import { readzedcafeexportstatscontentready } from 'zss/feature/wanix/wanixstateexport'
import { WANIX_ZEDCAFE_WASM_BUILD_ID } from 'zss/feature/wanix/wanixzedcafewasmversion'
import {
  isallowedexportpath,
  kebabcasezedcafedirname,
} from 'zss/feature/wanix/zedcafetreeschema'

import type {
  WanixRoot,
  WanixSystemElement,
  WanixVmElement,
} from './wanixelements.d.ts'
import {
  WANIX_ZEDCAFE_EXPORT_READY_POLL_MS,
  WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
  WANIX_ZEDCAFE_GUEST_MOUNT,
  WANIX_ZEDCAFE_TASK_ID,
  WANIX_ZEDCAFE_TASK_WASM,
  WANIX_ZEDCAFE_WASM_BUILD_STORAGE_KEY,
  WANIX_ZEDCAFE_WASM_RAMFS,
  readwanixzedcafeexportsrc,
  readwanixzedcafeguestpath,
  readwanixzedcafewasmurl,
} from './wanixzedcafeconstants'
import type { WanixZedCafeGuestFile } from './wanixzedcafetypes'

type WanixTaskElement = HTMLElement & {
  rid?: string | null
  root?: WanixRoot
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

export async function readzedcafeexporthasbooks(
  root: WanixRoot,
  taskrid: string,
): Promise<boolean> {
  if (!taskrid) {
    return false
  }
  const base = readwanixzedcafeexportsrc(taskrid)
  try {
    const raw = await root.readFile(`${base}/stats.json`)
    const bytes =
      raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw))
    const meta = readbookstatspathsfromstatsbytes(bytes)
    if (!meta || meta.bookcount < 1) {
      return false
    }
    return readbookstatsreadyatbase(root, base, meta.bookstatspaths)
  } catch {
    return false
  }
}

export function readzedcafereadylocal(): boolean {
  return zedcafeready
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
  if (vmtask?.root && (await readzedcafeguestboundatroot(vmtask.root))) {
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
    if (el.root && (await readzedcafeguestboundatroot(el.root))) {
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

export async function wireallguestroots(
  sys: WanixSystemElement,
  taskrid: string,
): Promise<number> {
  const src = readwanixzedcafeexportsrc(taskrid)
  const dst = WANIX_ZEDCAFE_GUEST_MOUNT
  await tryunbindexport(sys.root, src, dst)
  await sys.root.bind(src, dst)
  let count = 1
  const vm = sys.querySelector('wanix-vm') as WanixVmWithTask | null
  const vmtask = vm?.task
  if (vmtask?.root) {
    await tryunbindexport(vmtask.root, src, dst)
    await vmtask.root.bind(src, dst)
    count++
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

/** @deprecated use wireallguestroots */
export async function wirezedcafeexportbinds(
  sys: WanixSystemElement,
  taskrid: string,
): Promise<number> {
  return wireallguestroots(sys, taskrid)
}

async function collectexporttreefiles(
  root: WanixRoot,
  base: string,
): Promise<WanixZedCafeGuestFile[]> {
  const files: WanixZedCafeGuestFile[] = []

  // Leaf export files are always `*.json`. Directory segments may contain `.`
  // inside page/book ids (e.g. `key-sid_8FzEX.FvcYV1`) — those must be walked.
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
        files.push({ path: rel, data: [...bytes] })
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
        files.push({ path: rel, data: [...bytes] })
      } catch {
        // skip missing path
      }
      return
    }
    for (const entry of entries) {
      const name = entry.replace(/\/$/, '')
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
    const parsed = JSON.parse(
      new TextDecoder().decode(new Uint8Array(stats.data)),
    ) as {
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
      if (!/not exist|no such|enoent|not found/i.test(detail)) {
        console.error(`[zedcafe-export] remove failed ${relpath}: ${detail}`)
      }
    }
  }
  return removed
}

export async function pushzedcafeexportlive(
  root: WanixRoot,
  taskrid: string,
  files: WanixZedCafeGuestFile[],
  removepaths: string[] = [],
) {
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
  // Materialize allowlisted prefix dirs on the export mount first.
  for (let i = 0; i < sorted.length; ++i) {
    const file = sorted[i]
    const full = `${base}/${file.path}`
    const parentdir = full.slice(0, full.lastIndexOf('/'))
    if (parentdir.length > base.length) {
      await root.makeDirAll(parentdir)
    }
    await root.writeFile(full, new Uint8Array(file.data))
  }
  const bookcount = readguestfilebookcount(sorted)
  if (bookcount > 0) {
    const statsfile = sorted.find((file) => file.path === 'stats.json')
    const meta = statsfile
      ? readbookstatspathsfromstatsbytes(new Uint8Array(statsfile.data))
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
    postwanixexportmessage('content-ready', taskrid, {
      bookcount,
      paths: sorted.length,
      removed: removepaths.length,
    })
  }
  if (sorted.length > 0 || bookcount > 0) {
    setzedcafereadylocal(true)
  }
  wanixperfmark('export-push-end', {
    taskrid,
    bookcount,
    paths: sorted.length,
    removed: removepaths.length,
  })
}

export function haltzedcafetask(sys: WanixSystemElement) {
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

  await task.allocate?.()
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

  const mountready = await waitzedcafeexportmountready(
    root,
    taskrid,
    WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS,
  )
  if (!mountready) {
    return null
  }

  await scrubzedcafestaging(task, sys, root)
  return taskrid
}

export async function finalizezedcafeexportcontent(
  sys: WanixSystemElement,
  _root: WanixRoot,
  taskrid: string,
): Promise<void> {
  await wireallguestroots(sys, taskrid)
  zedcafeready = true
}

export async function ensurezedcafeboot(
  sys: WanixSystemElement,
  root: WanixRoot,
  cmd: string,
): Promise<string | null> {
  synczedcafewasmversionifneeded(sys)
  if (zedcafetaskrid && zedcafecmd === cmd) {
    const mountready = await waitzedcafeexportmountready(root, zedcafetaskrid)
    if (mountready) {
      return zedcafetaskrid
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

export async function waitzedcafemountrpc(
  sys: WanixSystemElement,
  root: WanixRoot,
  timeoutms: number,
): Promise<string | null> {
  if (!zedcafecmd) {
    return null
  }
  const deadline = Date.now() + timeoutms
  while (Date.now() < deadline) {
    if (zedcafetaskrid) {
      const mountready = await waitzedcafeexportmountready(
        root,
        zedcafetaskrid,
        Math.max(0, deadline - Date.now()),
      )
      if (mountready) {
        return zedcafetaskrid
      }
    }
    try {
      const taskrid = await ensurezedcafeboot(sys, root, zedcafecmd)
      if (taskrid) {
        return taskrid
      }
    } catch {
      // retry until deadline
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, WANIX_ZEDCAFE_EXPORT_READY_POLL_MS),
    )
  }
  return zedcafetaskrid
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
