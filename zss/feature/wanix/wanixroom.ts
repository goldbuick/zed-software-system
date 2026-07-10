import type { DEVICELIKE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import {
  readattachedsession,
  readwanixactivesession,
} from 'zss/feature/wanix/wanixattachstate'
import {
  callwanixrpc,
  registerwanixsessioncloseprune,
  waitwanixiframe,
  waitwanixready,
} from 'zss/feature/wanix/wanixbridge'
import {
  listwanixwasmentries,
  readbundleflatpath,
} from 'zss/feature/wanix/wanixbundle'
import { uniquewanixtaskid } from 'zss/feature/wanix/wanixcmd'
import type { WanixTaskDriver } from 'zss/feature/wanix/wanixelements.d.ts'
import { readwanixwasmdriver } from 'zss/feature/wanix/wanixwasmdriver'
import type {
  WanixDropPayload,
  WanixMenuState,
  WanixMenuVmStatus,
  WanixRoomConfig,
  WanixRoomStatus,
  WanixSpawnTaskResult,
} from 'zss/feature/wanix/wanixroomtypes'
import {
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
  createidleroomconfig,
} from 'zss/feature/wanix/wanixroomtypes'
import { readwanixtermbufferkeys } from 'zss/feature/wanix/wanixtermbuffer'
import { extractwanixtgz } from 'zss/feature/wanix/wanixtgzextract'
import { activatewanixzedcafeexport } from 'zss/feature/wanix/wanixactivateexport'
import { primezedcafeexportshadow } from 'zss/feature/wanix/wanixstateexport'
import {
  assertfindplayersexportready,
  finalizewanixzedcafeaftervmboot,
  readwanixbootzedcafestate,
  resetwanixzedcafeonidle,
  wanixdrainpendingzedcafeexport,
} from 'zss/feature/wanix/wanixzedcafe'
import { wanixperfmark, wanixperfreset } from 'zss/feature/wanix/wanixperf'
import type { WanixZedCafeRoomSpec } from 'zss/feature/wanix/wanixzedcafetypes'

const WANIX_ROOM_TIMEOUT_MS = 180_000
const WANIX_MENU_TIMEOUT_MS = 3_000

let roomconfig: WanixRoomConfig = createidleroomconfig()

function bumpmountkey(config: WanixRoomConfig): WanixRoomConfig {
  return { ...config, mountkey: config.mountkey + 1, hardreset: true }
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

export async function ensurewanixtaskroom(
  device?: DEVICELIKE,
  player?: string,
): Promise<void> {
  if (roomconfig.mode !== 'idle') {
    if (device && player) {
      apilog(
        device,
        player,
        'zedcafe: syncing export on active wanix room (no remount)…',
      )
      await activatewanixzedcafeexport(device, player)
    }
    return
  }
  if (device && player) {
    apilog(
      device,
      player,
      'wanix: standing up task room + zedcafe export (first drop — may take a moment)…',
    )
  }
  let zedcafe: WanixZedCafeRoomSpec | null | undefined
  const boot = await readwanixbootzedcafestate(device, player)
  if (boot) {
    zedcafe = {
      cmd: boot.cmd,
      generation: boot.generation,
    }
  }
  const next: WanixRoomConfig = {
    ...roomconfig,
    mode: 'task',
    archives: [],
    remotes: [],
    tasks: [],
    vm: undefined,
    zedcafe,
  }
  wanixperfmark('drop-start', { label: 'ensurewanixtaskroom' })
  await applywanixroom(next)
  wanixperfmark('applyroom-return', { mode: 'task' })
}

export async function startwanixvmroom(
  vmid = DEFAULT_WANIX_VM_ID,
  mem = DEFAULT_WANIX_VM_MEM,
  zedcafe?: WanixZedCafeRoomSpec | null,
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
    zedcafe: zedcafe ?? roomconfig.zedcafe,
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

export async function stopwanixroom(hard = false): Promise<unknown> {
  resetwanixzedcafeonidle()
  const next = createidleroomconfig()
  next.mountkey = hard ? roomconfig.mountkey + 1 : roomconfig.mountkey
  if (hard) {
    next.hardreset = true
  }
  return applywanixroom(next)
}

export async function spawntaskinroom(
  taskid: string,
  cmd: string,
  driver?: WanixTaskDriver,
): Promise<WanixSpawnTaskResult> {
  await waitwanixready(WANIX_ROOM_TIMEOUT_MS)
  const result = await callwanixrpc<WanixSpawnTaskResult>(
    'spawntask',
    [taskid, cmd, driver ?? null],
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

export function removewanixroomtask(taskid: string) {
  if (!roomconfig.tasks.some((task) => task.id === taskid)) {
    return
  }
  roomconfig = {
    ...roomconfig,
    tasks: roomconfig.tasks.filter((task) => task.id !== taskid),
  }
}

export async function putwanixroomfile(
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  await waitwanixready()
  await callwanixrpc('writefile', [path, Array.from(bytes)])
}

function withwanixtimeout<T>(
  promise: Promise<T>,
  timeoutms: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('wanix menu timeout'))
    }, timeoutms)
    void promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err instanceof Error ? err : new Error(String(err)))
      },
    )
  })
}

function readwanixmenusessionfields() {
  return {
    sessionkeys: readwanixtermbufferkeys(),
    attachedsessionkey: readattachedsession(),
    activesessionkey: readwanixactivesession(),
  }
}

export async function readwanixmenustate(
  timeoutms = WANIX_MENU_TIMEOUT_MS,
): Promise<WanixMenuState> {
  const config = readwanixroomconfig()
  if (config.mode === 'idle') {
    return {
      config,
      ready: false,
      vmrunning: false,
      vm: null,
      stalled: false,
      ...readwanixmenusessionfields(),
    }
  }
  try {
    const [roomstatus, vmstatus] = await withwanixtimeout(
      Promise.all([
        callwanixrpc<WanixRoomStatus & { vmrunning?: boolean }>(
          'readroomstatus',
          [],
          timeoutms,
        ),
        callwanixrpc<WanixMenuVmStatus>('readvmstatus', [], timeoutms),
      ]),
      timeoutms,
    )
    const vmrunning = roomstatus.vmrunning ?? vmstatus.running ?? false
    return {
      config: {
        ...config,
        mode: roomstatus.mode ?? config.mode,
        tasks: roomstatus.tasks ?? config.tasks,
        vm: roomstatus.vm ?? config.vm,
      },
      ready: roomstatus.ready ?? false,
      vmrunning,
      vm: vmrunning || vmstatus.running ? vmstatus : null,
      stalled: false,
      ...readwanixmenusessionfields(),
    }
  } catch {
    return {
      config,
      ready: false,
      vmrunning: false,
      vm: null,
      stalled: true,
      ...readwanixmenusessionfields(),
    }
  }
}

function normalizewanixpath(label: string): string {
  const trimmed = label.replace(/^\/+/, '')
  return trimmed.startsWith('#ramfs/') ? trimmed : `#ramfs/${trimmed}`
}

function readtaskidset(): Set<string> {
  return new Set(roomconfig.tasks.map((task) => task.id))
}

export async function handlewanixdrop(
  payload: WanixDropPayload,
  device?: DEVICELIKE,
  player?: string,
): Promise<{
  taskid: string
  cmd: string
  spawns: { taskid: string; cmd: string }[]
}> {
  const taskid = uniquewanixtaskid(
    payload.label,
    roomconfig.tasks.map((task) => task.id),
  )

  if (payload.kind === 'wasm') {
    wanixperfreset()
    await ensurewanixtaskroom(device, player)
    const path = normalizewanixpath(payload.label)
    if (device && player) {
      apilog(
        device,
        player,
        `wanix: staging ${payload.label} (${payload.bytes.length} bytes)…`,
      )
    }
    wanixperfmark('wasm-write-start', { path, bytes: payload.bytes.length })
    const exportready =
      device && player
        ? activatewanixzedcafeexport(device, player)
        : Promise.resolve()
    const stagewasm = putwanixroomfile(path, payload.bytes)
    await Promise.all([exportready, stagewasm])
    wanixperfmark('wasm-write-end', { path, bytes: payload.bytes.length })
    const isfindplayers = payload.label.toLowerCase().includes('findplayers')
    if (isfindplayers && device && player) {
      await assertfindplayersexportready(device, player)
    } else if (device && player) {
      apilog(device, player, `wanix: spawning task ${taskid}…`)
    }
    await spawntaskinroom(taskid, path, readwanixwasmdriver(payload.bytes))
    wanixperfmark('spawntask-return', { taskid, cmd: path })
    if (device && player && isfindplayers) {
      apilog(
        device,
        player,
        `findplayers: task ${taskid} running — attach via #wanix or check task term for JSON output`,
      )
    }
    return { taskid, cmd: path, spawns: [{ taskid, cmd: path }] }
  }

  await ensurewanixtaskroom(device, player)
  if (device && player) {
    await activatewanixzedcafeexport(device, player)
  }
  const prefix = `bundle-${taskid}`
  const files = await extractwanixtgz(payload.bytes, prefix)
  const driverbycmd = new Map<string, WanixTaskDriver>()
  for (const file of files) {
    const flatpath = readbundleflatpath(prefix, file.path)
    const cmd = normalizewanixpath(flatpath)
    if (file.path.toLowerCase().endsWith('.wasm')) {
      driverbycmd.set(cmd, readwanixwasmdriver(file.bytes))
    }
    await putwanixroomfile(cmd, file.bytes)
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
    await spawntaskinroom(subtaskid, cmd, driverbycmd.get(cmd))
    spawns.push({ taskid: subtaskid, cmd })
    if (!firstcmd) {
      firstcmd = cmd
    }
  }

  return { taskid, cmd: firstcmd, spawns }
}

registerwanixsessioncloseprune(removewanixroomtask)

export type WanixVmStatus = {
  running: boolean
  vmid: string | null
  vrid: string | null
  mem: string | null
}

export type WanixVmStartResult = {
  ok: boolean
  already?: boolean
  vmid: string
  vrid?: string | null
  mem?: string | null
}

export async function startwanixvm(
  mem = DEFAULT_WANIX_VM_MEM,
  vmid = DEFAULT_WANIX_VM_ID,
  device?: DEVICELIKE,
  player?: string,
): Promise<WanixVmStartResult> {
  let zedcafe: WanixZedCafeRoomSpec | null | undefined
  if (device && player) {
    wanixperfreset()
    const boot = await readwanixbootzedcafestate(device, player)
    if (boot) {
      zedcafe = {
        cmd: boot.cmd,
        generation: boot.generation,
      }
    }
  }
  const result = (await startwanixvmroom(
    vmid,
    mem,
    zedcafe,
  )) as WanixVmStatus & {
    vrid?: string | null
    already?: boolean
  }
  if (device && player) {
    wanixperfmark('vm-boot-finalize-start')
    apilog(device, player, 'zedcafe: finalizing export after vm boot…')
    primezedcafeexportshadow()
    await finalizewanixzedcafeaftervmboot(device, player)
    wanixdrainpendingzedcafeexport(device, player)
    wanixperfmark('vm-boot-finalize-end')
  }
  if (result.running) {
    return {
      ok: true,
      already: true,
      vmid: result.vmid ?? vmid,
      vrid: result.vrid ?? null,
      mem: result.mem ?? mem,
    }
  }
  return {
    ok: true,
    vmid: result.vmid ?? vmid,
    vrid: result.vrid ?? null,
    mem: result.mem ?? mem,
  }
}

export async function stopwanixvm(
  vmid = DEFAULT_WANIX_VM_ID,
): Promise<{ ok: boolean }> {
  const config = readwanixroomconfig()
  if (config.mode !== 'vm') {
    return { ok: true }
  }
  if (config.vm?.id && config.vm.id !== vmid) {
    return { ok: true }
  }
  await stopwanixvmroom()
  return { ok: true }
}
