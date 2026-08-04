import { MEMORYFS_DIRNAME } from 'zss/feature/memoryfs/constants'
import { memoryfshashbytes } from 'zss/feature/memoryfs/hash'
import { memoryfsisreadonlypath } from 'zss/feature/memoryfs/readonly'
import {
  type MEMORYFS_PATH_FILE,
  isallowedmemoryfspath,
} from 'zss/feature/memoryfs/schema'
import type { MEMORYFS_SKILL_FILE } from 'zss/feature/memoryfs/skills'
import { ispresent } from 'zss/mapping/types'

export type MEMORYFS_FSA_STATE = {
  dropdir: FileSystemDirectoryHandle
  syncroot: FileSystemDirectoryHandle
  dropname: string
  lastseen: Map<string, string>
  /** Paths we wrote; ignore inbound until generation expires. */
  writestamp: Map<string, number>
  polltimer: ReturnType<typeof setInterval> | undefined
}

let state: MEMORYFS_FSA_STATE | undefined

export function memoryfsfsaattached(): boolean {
  return ispresent(state)
}

export function memoryfsfsareadstate(): MEMORYFS_FSA_STATE | undefined {
  return state
}

export async function memoryfsfsarequestpermission(
  dir: FileSystemDirectoryHandle,
): Promise<boolean> {
  const withperm = dir as FileSystemDirectoryHandle & {
    requestPermission?: (opts: {
      mode: 'readwrite'
    }) => Promise<PermissionState>
  }
  if (typeof withperm.requestPermission !== 'function') {
    return true
  }
  const result = await withperm.requestPermission({ mode: 'readwrite' })
  return result === 'granted'
}

export async function memoryfsfsanuclearclear(
  syncroot: FileSystemDirectoryHandle,
): Promise<void> {
  const dir = syncroot as FileSystemDirectoryHandle & {
    entries: () => AsyncIterableIterator<[string, FileSystemHandle]>
  }
  const entries: string[] = []
  for await (const [name] of dir.entries()) {
    entries.push(name)
  }
  for (let i = 0; i < entries.length; ++i) {
    await syncroot.removeEntry(entries[i], { recursive: true })
  }
}

async function ensuredirectory(
  root: FileSystemDirectoryHandle,
  segments: string[],
): Promise<FileSystemDirectoryHandle> {
  let current = root
  for (let i = 0; i < segments.length; ++i) {
    current = await current.getDirectoryHandle(segments[i], { create: true })
  }
  return current
}

export async function memoryfsfsawritefile(
  syncroot: FileSystemDirectoryHandle,
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  const parts = path.split('/')
  const filename = parts[parts.length - 1]
  const dirparts = parts.slice(0, -1)
  const dir =
    dirparts.length > 0 ? await ensuredirectory(syncroot, dirparts) : syncroot
  const file = await dir.getFileHandle(filename, { create: true })
  const writable = await file.createWritable()
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  await writable.write(copy)
  await writable.close()
}

export async function memoryfsfsadeletepath(
  syncroot: FileSystemDirectoryHandle,
  path: string,
): Promise<void> {
  const parts = path.split('/')
  if (parts.length === 0) {
    return
  }
  try {
    if (parts.length === 1) {
      await syncroot.removeEntry(parts[0])
      return
    }
    let current = syncroot
    for (let i = 0; i < parts.length - 1; ++i) {
      current = await current.getDirectoryHandle(parts[i])
    }
    await current.removeEntry(parts[parts.length - 1], { recursive: true })
  } catch {
    // missing path is fine
  }
}

async function walkfiles(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  out: MEMORYFS_PATH_FILE[],
): Promise<void> {
  const iterable = dir as FileSystemDirectoryHandle & {
    entries: () => AsyncIterableIterator<[string, FileSystemHandle]>
  }
  for await (const [name, handle] of iterable.entries()) {
    const path = prefix ? `${prefix}/${name}` : name
    if (handle.kind === 'directory') {
      await walkfiles(handle as FileSystemDirectoryHandle, path, out)
    } else if (handle.kind === 'file' && isallowedmemoryfspath(path)) {
      const file = await (handle as FileSystemFileHandle).getFile()
      const buffer = await file.arrayBuffer()
      out.push({ path, bytes: new Uint8Array(buffer) })
    }
  }
}

export async function memoryfsfsareadallowlisted(
  syncroot: FileSystemDirectoryHandle,
): Promise<MEMORYFS_PATH_FILE[]> {
  const out: MEMORYFS_PATH_FILE[] = []
  await walkfiles(syncroot, '', out)
  return out
}

export function memoryfsfsastampwrites(paths: string[], now = Date.now()) {
  if (!state) {
    return
  }
  for (let i = 0; i < paths.length; ++i) {
    state.writestamp.set(paths[i], now)
  }
}

export function memoryfsfsshouldignoreinbound(
  path: string,
  now = Date.now(),
  windowms = 2500,
): boolean {
  if (!state) {
    return false
  }
  if (memoryfsisreadonlypath(path)) {
    return true
  }
  const stamped = state.writestamp.get(path)
  if (stamped === undefined) {
    return false
  }
  return now - stamped < windowms
}

export type MEMORYFS_POLL_DELTA = {
  writes: MEMORYFS_PATH_FILE[]
  deletes: string[]
}

export async function memoryfsfsapolldelta(): Promise<
  MEMORYFS_POLL_DELTA | undefined
> {
  if (!state) {
    return undefined
  }
  const files = await memoryfsfsareadallowlisted(state.syncroot)
  const now = Date.now()
  const writes: MEMORYFS_PATH_FILE[] = []
  const seen = new Set<string>()
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    seen.add(file.path)
    const hash = memoryfshashbytes(file.bytes)
    const prev = state.lastseen.get(file.path)
    if (prev === hash) {
      continue
    }
    if (memoryfsfsshouldignoreinbound(file.path, now)) {
      state.lastseen.set(file.path, hash)
      continue
    }
    writes.push(file)
    state.lastseen.set(file.path, hash)
  }
  const deletes: string[] = []
  const prevpaths = [...state.lastseen.keys()]
  for (let i = 0; i < prevpaths.length; ++i) {
    const path = prevpaths[i]
    if (seen.has(path)) {
      continue
    }
    state.lastseen.delete(path)
    if (memoryfsfsshouldignoreinbound(path, now)) {
      continue
    }
    if (memoryfsisreadonlypath(path)) {
      continue
    }
    deletes.push(path)
  }
  if (writes.length === 0 && deletes.length === 0) {
    return undefined
  }
  return { writes, deletes }
}

export async function memoryfsfsaattach(
  dropdir: FileSystemDirectoryHandle,
): Promise<MEMORYFS_FSA_STATE> {
  const ok = await memoryfsfsarequestpermission(dropdir)
  if (!ok) {
    throw new Error('memoryfs permission denied')
  }
  const syncroot = await dropdir.getDirectoryHandle(MEMORYFS_DIRNAME, {
    create: true,
  })
  await memoryfsfsanuclearclear(syncroot)
  state = {
    dropdir,
    syncroot,
    dropname: dropdir.name,
    lastseen: new Map(),
    writestamp: new Map(),
    polltimer: undefined,
  }
  return state
}

export async function memoryfsfsawritebatch(payload: {
  files: MEMORYFS_PATH_FILE[]
  deletes?: string[]
  full?: boolean
}): Promise<void> {
  if (!state) {
    return
  }
  const { syncroot } = state
  if (payload.full) {
    await memoryfsfsanuclearclear(syncroot)
    state.lastseen.clear()
  }
  const deletes = payload.deletes ?? []
  for (let i = 0; i < deletes.length; ++i) {
    await memoryfsfsadeletepath(syncroot, deletes[i])
    state.lastseen.delete(deletes[i])
  }
  const stamped: string[] = []
  for (let i = 0; i < payload.files.length; ++i) {
    const file = payload.files[i]
    if (!isallowedmemoryfspath(file.path)) {
      continue
    }
    await memoryfsfsawritefile(syncroot, file.path, file.bytes)
    state.lastseen.set(file.path, memoryfshashbytes(file.bytes))
    stamped.push(file.path)
  }
  memoryfsfsastampwrites(stamped)
}

/** Write agent skill sidecars under the drop-folder root (not syncroot / lastseen). */
export async function memoryfsfsawritedropskills(
  files: MEMORYFS_SKILL_FILE[],
): Promise<void> {
  if (!state) {
    return
  }
  const { dropdir } = state
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    if (!file.path || file.path.includes('..') || file.path.startsWith('/')) {
      continue
    }
    await memoryfsfsawritefile(dropdir, file.path, file.bytes)
  }
}

export function memoryfsfsadetach() {
  if (!state) {
    return
  }
  if (state.polltimer) {
    clearInterval(state.polltimer)
  }
  state = undefined
}

export function memoryfsfsasetpolltimer(
  timer: ReturnType<typeof setInterval> | undefined,
) {
  if (state) {
    state.polltimer = timer
  }
}
