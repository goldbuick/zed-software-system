import { callwanixrpc, waitwanixready } from 'zss/feature/wanix/wanixbridge'
import { pickwanixbundleentry } from 'zss/feature/wanix/wanixbundle'
import { uniquewanixtaskid } from 'zss/feature/wanix/wanixcmd'
import type {
  WanixDropPayload,
  WanixRoomConfig,
  WanixRoomStatus,
  WanixSpawnTaskResult,
} from 'zss/feature/wanix/wanixroomtypes'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'
import {
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
} from 'zss/feature/wanix/wanixvm'

const WANIX_ROOM_TIMEOUT_MS = 180_000

let roomconfig: WanixRoomConfig = createidleroomconfig()
const archivebloburls = new Map<string, string>()

function bumpmountkey(config: WanixRoomConfig): WanixRoomConfig {
  return { ...config, mountkey: config.mountkey + 1 }
}

export function readwanixroomconfig(): WanixRoomConfig {
  return roomconfig
}

export async function applywanixroom(
  config: WanixRoomConfig,
): Promise<unknown> {
  await waitwanixready(WANIX_ROOM_TIMEOUT_MS)
  const result = await callwanixrpc<unknown>(
    'applyroom',
    [config],
    WANIX_ROOM_TIMEOUT_MS,
  )
  roomconfig = config
  return result
}

export async function ensurewanixtaskroom(): Promise<void> {
  if (roomconfig.mode !== 'idle') {
    return
  }
  const next: WanixRoomConfig = {
    ...bumpmountkey(roomconfig),
    mode: 'task',
    archives: [],
    remotes: [],
    tasks: [],
    vm: undefined,
  }
  await applywanixroom(next)
}

export async function startwanixvmroom(
  vmid = DEFAULT_WANIX_VM_ID,
  mem = DEFAULT_WANIX_VM_MEM,
): Promise<unknown> {
  if (
    roomconfig.mode === 'vm' &&
    roomconfig.vm?.active &&
    roomconfig.vm.id === vmid &&
    roomconfig.vm.mem === mem
  ) {
    await waitwanixready(WANIX_ROOM_TIMEOUT_MS)
    return callwanixrpc('readvmstatus')
  }
  const next: WanixRoomConfig = {
    ...bumpmountkey(roomconfig),
    mode: 'vm',
    archives: roomconfig.archives,
    remotes: roomconfig.remotes,
    tasks: [],
    vm: { id: vmid, mem, active: true },
  }
  return applywanixroom(next)
}

export async function stopwanixroom(): Promise<unknown> {
  for (const url of archivebloburls.values()) {
    URL.revokeObjectURL(url)
  }
  archivebloburls.clear()
  const next = createidleroomconfig()
  next.mountkey = roomconfig.mountkey + 1
  return applywanixroom(next)
}

export async function spawntaskinroom(
  taskid: string,
  cmd: string,
): Promise<WanixSpawnTaskResult> {
  await waitwanixready(WANIX_ROOM_TIMEOUT_MS)
  const result = await callwanixrpc<WanixSpawnTaskResult>(
    'spawntask',
    [taskid, cmd],
    WANIX_ROOM_TIMEOUT_MS,
  )
  roomconfig = {
    ...roomconfig,
    tasks: [
      ...roomconfig.tasks.filter((task) => task.id !== taskid),
      { id: taskid, cmd, running: true },
    ],
  }
  return result
}

export async function halttaskinroom(taskid: string): Promise<{ ok: boolean }> {
  await waitwanixready()
  const result = await callwanixrpc<{ ok: boolean }>('halttask', [taskid])
  roomconfig = {
    ...roomconfig,
    tasks: roomconfig.tasks.filter((task) => task.id !== taskid),
  }
  return result
}

export async function putwanixroomfile(
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  await waitwanixready()
  await callwanixrpc('writefile', [path, Array.from(bytes)])
}

export async function listwanixroomdir(path: string): Promise<string[]> {
  await waitwanixready()
  return callwanixrpc<string[]>('listdir', [path])
}

export async function readwanixroomstatus(): Promise<WanixRoomStatus> {
  await waitwanixready()
  return callwanixrpc<WanixRoomStatus>('readroomstatus')
}

function normalizewanixpath(label: string): string {
  const trimmed = label.replace(/^\/+/, '')
  return trimmed.startsWith('#ramfs/') ? trimmed : `#ramfs/${trimmed}`
}

export async function handlewanixdrop(payload: WanixDropPayload): Promise<{
  taskid: string
  cmd: string
}> {
  const taskid = uniquewanixtaskid(
    payload.label,
    roomconfig.tasks.map((task) => task.id),
  )

  if (payload.kind === 'wasm') {
    await ensurewanixtaskroom()
    const path = normalizewanixpath(payload.label)
    await putwanixroomfile(path, payload.bytes)
    await spawntaskinroom(taskid, path)
    return { taskid, cmd: path }
  }

  const bundledst = `bundle-${taskid}`
  const bloburl = URL.createObjectURL(
    new Blob([payload.bytes], { type: 'application/gzip' }),
  )
  archivebloburls.set(taskid, bloburl)

  const next: WanixRoomConfig = {
    ...(roomconfig.mode === 'idle'
      ? bumpmountkey(roomconfig)
      : { ...roomconfig, mountkey: roomconfig.mountkey + 1 }),
    mode: 'task',
    remotes: roomconfig.remotes,
    tasks: roomconfig.tasks,
    vm: undefined,
    archives: [
      ...roomconfig.archives.filter((entry) => entry.id !== taskid),
      { id: taskid, dst: bundledst, src: bloburl },
    ],
  }
  await applywanixroom(next)

  const rootentries = await listwanixroomdir('.')
  let bundleentries: string[] | null = null
  try {
    bundleentries = await listwanixroomdir(bundledst)
  } catch {
    bundleentries = null
  }
  const cmd = pickwanixbundleentry(rootentries, bundleentries, bundledst)
  await spawntaskinroom(taskid, cmd)
  return { taskid, cmd }
}

export async function parsewanixdropfile(
  file: File,
): Promise<WanixDropPayload> {
  const lower = file.name.toLowerCase()
  const kind = lower.endsWith('.tgz') ? 'bundle' : 'wasm'
  const bytes = new Uint8Array(await file.arrayBuffer())
  return { label: file.name, kind, bytes }
}
