import {
  callwanixrpc,
  waitwanixiframe,
  waitwanixready,
} from 'zss/feature/wanix/wanixbridge'
import { listwanixwasmentries, readbundleflatpath } from 'zss/feature/wanix/wanixbundle'
import { uniquewanixtaskid } from 'zss/feature/wanix/wanixcmd'
import type {
  WanixDropPayload,
  WanixRoomConfig,
  WanixRoomStatus,
  WanixSpawnTaskResult,
} from 'zss/feature/wanix/wanixroomtypes'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'
import { extractwanixtgz } from 'zss/feature/wanix/wanixtgzextract'
import {
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
} from 'zss/feature/wanix/wanixvm'

const WANIX_ROOM_TIMEOUT_MS = 180_000

let roomconfig: WanixRoomConfig = createidleroomconfig()

function bumpmountkey(config: WanixRoomConfig): WanixRoomConfig {
  return { ...config, mountkey: config.mountkey + 1 }
}

export function readwanixroomconfig(): WanixRoomConfig {
  return roomconfig
}

export async function applywanixroom(
  config: WanixRoomConfig,
): Promise<unknown> {
  await waitwanixiframe(WANIX_ROOM_TIMEOUT_MS)
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

export async function stopwanixvmroom(): Promise<unknown> {
  await waitwanixready(WANIX_ROOM_TIMEOUT_MS)
  const result = await callwanixrpc<unknown>(
    'stopvm',
    [],
    WANIX_ROOM_TIMEOUT_MS,
  )
  roomconfig = {
    ...roomconfig,
    mode: 'task',
    vm: undefined,
  }
  return result
}

export async function stopwanixroom(): Promise<unknown> {
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

export async function halttaskinroom(
  taskid: string,
): Promise<{ ok: boolean; idle?: boolean }> {
  if (roomconfig.mode === 'idle') {
    return { ok: true, idle: true }
  }
  if (!roomconfig.tasks.some((task) => task.id === taskid)) {
    return { ok: true, idle: true }
  }
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
  if (roomconfig.mode === 'idle') {
    return []
  }
  await waitwanixready()
  return callwanixrpc<string[]>('listdir', [path])
}

export async function readwanixroomstatus(): Promise<
  WanixRoomStatus & { vmrunning?: boolean }
> {
  if (roomconfig.mode === 'idle') {
    return { ...roomconfig, ready: false, vmrunning: false }
  }
  await waitwanixready()
  return callwanixrpc<WanixRoomStatus & { vmrunning?: boolean }>(
    'readroomstatus',
  )
}

function normalizewanixpath(label: string): string {
  const trimmed = label.replace(/^\/+/, '')
  return trimmed.startsWith('#ramfs/') ? trimmed : `#ramfs/${trimmed}`
}

function readtaskidset(): Set<string> {
  return new Set(roomconfig.tasks.map((task) => task.id))
}

export async function handlewanixdrop(payload: WanixDropPayload): Promise<{
  taskid: string
  cmd: string
  spawns: { taskid: string; cmd: string }[]
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
    return { taskid, cmd: path, spawns: [{ taskid, cmd: path }] }
  }

  await ensurewanixtaskroom()
  const prefix = `bundle-${taskid}`
  const files = await extractwanixtgz(payload.bytes, prefix)
  for (const file of files) {
    const flatpath = readbundleflatpath(prefix, file.path)
    await putwanixroomfile(normalizewanixpath(flatpath), file.bytes)
  }

  const wasmpaths = listwanixwasmentries(files, prefix)
  if (!wasmpaths.length) {
    return { taskid, cmd: '', spawns: [] }
  }

  const usedids = readtaskidset()
  const spawns: { taskid: string; cmd: string }[] = []
  let firstcmd = ''
  for (const relpath of wasmpaths) {
    const flatpath = readbundleflatpath(prefix, relpath)
    const cmd = normalizewanixpath(flatpath)
    const basename = relpath.split('/').pop() ?? relpath
    const subtaskid = uniquewanixtaskid(`${taskid}-${basename}`, usedids)
    usedids.add(subtaskid)
    await spawntaskinroom(subtaskid, cmd)
    spawns.push({ taskid: subtaskid, cmd })
    if (!firstcmd) {
      firstcmd = cmd
    }
  }

  return { taskid, cmd: firstcmd, spawns }
}
