import {
  apilog,
  wanixserverapplyroom,
  wanixserverbinddrop,
  wanixserverhalttask,
  wanixserverreadvmstatus,
  wanixserverspawntask,
  wanixserverstopvm,
  wanixserverwritefile,
} from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/types'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  clearlasthostpushdoc,
  readpendingapplyconfig,
  readpendingspawn,
  readwanixroomconfig as readwanixroomconfigstate,
  setpendingapplyconfig,
  setpendingspawn,
  setwanixroomconfig,
} from 'zss/device/wanixclient/state'
import { activatewanixzedcafeexport } from 'zss/device/wanixclient/wanixactivateexport'
import { registerwanixsessioncloseprune } from 'zss/device/wanixclient/wanixbridge'
import {
  readwanixbootzedcafestate,
  resetwanixzedcafeonidle,
} from 'zss/device/wanixclient/wanixzedcafe'
import type { WanixTaskDriver } from 'zss/feature/wanix/wanixelements.d.ts'
import { wanixperfmark } from 'zss/feature/wanix/wanixperf'
import type {
  WanixBindDropPayload,
  WanixRemoteSpec,
  WanixRoomConfig,
} from 'zss/feature/wanix/wanixroomtypes'
import {
  DEFAULT_WANIX_REMOTE_DST,
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
  createidleroomconfig,
} from 'zss/feature/wanix/wanixroomtypes'
import type { WanixZedCafeRoomSpec } from 'zss/feature/wanix/wanixzedcafetypes'

function normalizeremotedst(dst: string): string {
  return dst.replace(/^\/+/, '').trim()
}

function remotematches(remote: WanixRemoteSpec, key: string): boolean {
  const needle = key.trim()
  return remote.id === needle || remote.dst === normalizeremotedst(needle)
}

function bumpmountkey(config: WanixRoomConfig): WanixRoomConfig {
  return { ...config, mountkey: config.mountkey + 1, hardreset: true }
}

export function readwanixroomconfig(): WanixRoomConfig {
  return readwanixroomconfigstate()
}

export function applywanixroom(config: WanixRoomConfig): void {
  if (config.hardreset) {
    clearlasthostpushdoc()
  }
  setpendingapplyconfig(config)
  setwanixroomconfig(config)
  wanixserverapplyroom(SOFTWARE, registerreadplayer(), config)
}

export function applywanixroomresult(
  device?: DEVICELIKE,
  player?: string,
  result?: unknown,
): void {
  const res =
    result && typeof result === 'object'
      ? (result as {
          ok?: boolean
          mode?: string
          mountkey?: number
          vmid?: string
          mem?: string
        })
      : undefined
  if (res?.ok === false) {
    return
  }
  const pending = readpendingapplyconfig()
  if (pending) {
    const mountmatches =
      typeof res?.mountkey !== 'number' || pending.mountkey === res.mountkey
    if (mountmatches) {
      setwanixroomconfig(pending)
      setpendingapplyconfig(null)
    }
  }
  // Pending can be overwritten by a later applyroom; restore from iframe result
  // before activate so iswanixspaceactive() is true and push is not deferred.
  if (res?.mode === 'vm' || res?.mode === 'task') {
    const boot = readwanixbootzedcafestate()
    const base = readwanixroomconfig()
    if (base.mode !== res.mode || !base.zedcafe?.cmd) {
      setwanixroomconfig({
        ...base,
        mode: res.mode,
        mountkey:
          typeof res.mountkey === 'number' ? res.mountkey : base.mountkey,
        hardreset: false,
        zedcafe: base.zedcafe ?? {
          cmd: boot.cmd,
          generation: boot.generation,
        },
        ...(res.mode === 'vm'
          ? {
              vm: {
                id: res.vmid ?? DEFAULT_WANIX_VM_ID,
                mem: res.mem ?? DEFAULT_WANIX_VM_MEM,
                active: true,
              },
              tasks: [],
            }
          : {}),
      })
    }
  }
  const config = readwanixroomconfig()
  const mode = typeof res?.mode === 'string' ? res.mode : config.mode
  // Iframe applyroom replies often arrive with empty player (see filter.ts).
  const activateplayer =
    typeof player === 'string' && player.length > 0
      ? player
      : registerreadplayer()
  const activatedevice = device ?? SOFTWARE
  const zedcafecmd =
    config.zedcafe?.cmd ??
    ((mode === 'vm' || mode === 'task') && activateplayer
      ? readwanixbootzedcafestate().cmd
      : undefined)
  if (activateplayer && zedcafecmd && (mode === 'vm' || mode === 'task')) {
    wanixperfmark('applyroom-activate', {
      mode,
      mountkey: res?.mountkey ?? null,
      hadpending: !!pending,
    })
    void activatewanixzedcafeexport(activatedevice, activateplayer)
  }
}

export function ensurewanixtaskroom(
  device?: DEVICELIKE,
  player?: string,
): void {
  if (readwanixroomconfig().mode !== 'idle') {
    if (device && player) {
      apilog(
        device,
        player,
        'zedcafe: syncing export on active wanix room (no remount)…',
      )
      void activatewanixzedcafeexport(device, player)
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
  const boot = readwanixbootzedcafestate()
  if (boot) {
    zedcafe = {
      cmd: boot.cmd,
      generation: boot.generation,
    }
  }
  const current = readwanixroomconfig()
  const next: WanixRoomConfig = {
    ...bumpmountkey(current),
    mode: 'task',
    archives: [],
    remotes: current.remotes,
    tasks: [],
    vm: undefined,
    zedcafe,
  }
  applywanixroom(next)
}

export function readwanixremotes(): WanixRemoteSpec[] {
  return readwanixroomconfig().remotes
}

/** Append or replace a WSS 9P remote import; remounts when room is active. */
export function connectwanixremote(url: string, dst?: string): WanixRemoteSpec {
  const trimmedurl = url.trim()
  const mountdst = normalizeremotedst(dst ?? DEFAULT_WANIX_REMOTE_DST)
  if (!mountdst) {
    throw new Error('wanix remote dst empty')
  }
  if (/\s/.test(mountdst)) {
    throw new Error('wanix remote dst must not contain spaces')
  }
  const remote: WanixRemoteSpec = {
    id: `remote-${mountdst}`,
    dst: mountdst,
    url: trimmedurl,
  }
  const current = readwanixroomconfig()
  const remotes = [
    ...current.remotes.filter((entry) => entry.dst !== mountdst),
    remote,
  ]
  if (current.mode === 'idle') {
    setwanixroomconfig({ ...current, remotes })
    return remote
  }
  applywanixroom({
    ...bumpmountkey(current),
    remotes,
    hardreset: true,
  })
  return remote
}

/** Remove a remote by id or dst; remounts when room is active. */
export function disconnectwanixremote(key?: string): WanixRemoteSpec[] {
  const current = readwanixroomconfig()
  let remotes = current.remotes
  if (!key || !key.trim()) {
    remotes = []
  } else {
    remotes = current.remotes.filter((entry) => !remotematches(entry, key))
  }
  if (current.mode === 'idle') {
    setwanixroomconfig({ ...current, remotes })
    return remotes
  }
  applywanixroom({
    ...bumpmountkey(current),
    remotes,
    hardreset: true,
  })
  return remotes
}

export function startwanixvmroom(
  vmid = DEFAULT_WANIX_VM_ID,
  mem = DEFAULT_WANIX_VM_MEM,
  zedcafe?: WanixZedCafeRoomSpec | null,
): void {
  const current = readwanixroomconfig()
  if (
    current.mode === 'vm' &&
    current.vm?.active &&
    current.vm.id === vmid &&
    current.vm.mem === mem
  ) {
    wanixserverreadvmstatus(SOFTWARE, registerreadplayer())
    return
  }
  const next: WanixRoomConfig = {
    ...bumpmountkey(current),
    mode: 'vm',
    archives: current.archives,
    remotes: current.remotes,
    tasks: [],
    vm: { id: vmid, mem, active: true },
    zedcafe: zedcafe ?? current.zedcafe,
  }
  applywanixroom(next)
}

export function stopwanixvmroom(): void {
  wanixserverstopvm(SOFTWARE, registerreadplayer())
  setwanixroomconfig({
    ...readwanixroomconfig(),
    mode: 'task',
    vm: undefined,
  })
}

export function stopwanixroom(hard = false): void {
  resetwanixzedcafeonidle()
  const current = readwanixroomconfig()
  const next = createidleroomconfig()
  next.mountkey = hard ? current.mountkey + 1 : current.mountkey
  next.remotes = hard ? [] : current.remotes
  if (hard) {
    next.hardreset = true
  }
  applywanixroom(next)
}

export function spawntaskinroom(
  taskid: string,
  cmd: string,
  driver?: WanixTaskDriver,
): void {
  setpendingspawn({ taskid, cmd })
  setwanixroomconfig({
    ...readwanixroomconfig(),
    tasks: [
      ...readwanixroomconfig().tasks.filter((task) => task.id !== taskid),
      { id: taskid, cmd, running: true },
    ],
  })
  wanixserverspawntask(SOFTWARE, registerreadplayer(), taskid, cmd, driver)
}

export function applywanixtaskspawnresult(data: unknown): void {
  if (
    data &&
    typeof data === 'object' &&
    (data as { ok?: unknown }).ok === false
  ) {
    const pending = readpendingspawn()
    if (pending) {
      const { taskid } = pending
      setwanixroomconfig({
        ...readwanixroomconfig(),
        tasks: readwanixroomconfig().tasks.filter((task) => task.id !== taskid),
      })
    }
  }
  setpendingspawn(null)
}

export function halttaskinroom(taskid: string): void {
  if (readwanixroomconfig().mode === 'idle') {
    return
  }
  if (!readwanixroomconfig().tasks.some((task) => task.id === taskid)) {
    return
  }
  wanixserverhalttask(SOFTWARE, registerreadplayer(), taskid)
  setwanixroomconfig({
    ...readwanixroomconfig(),
    tasks: readwanixroomconfig().tasks.filter((task) => task.id !== taskid),
  })
}

export function removewanixroomtask(taskid: string) {
  if (!readwanixroomconfig().tasks.some((task) => task.id === taskid)) {
    return
  }
  setwanixroomconfig({
    ...readwanixroomconfig(),
    tasks: readwanixroomconfig().tasks.filter((task) => task.id !== taskid),
  })
}

function onwanixsessionclose(sessionkey: string) {
  if (sessionkey === 'zedsync' || sessionkey.startsWith('zedsync-')) {
    apilog(SOFTWARE, registerreadplayer(), 'zedsync stopped')
    void import('zss/device/wanixclient/wanixzedsync').then((mod) => {
      mod.cancelzedsyncreadywait()
    })
  }
  removewanixroomtask(sessionkey)
}

registerwanixsessioncloseprune(onwanixsessionclose)

export function putwanixroomfile(path: string, bytes: Uint8Array): void {
  wanixserverwritefile(SOFTWARE, registerreadplayer(), path, Array.from(bytes))
}

export function handlewanixbinddrop(
  payload: WanixBindDropPayload,
  sessionkey: string,
): void {
  wanixserverbinddrop(SOFTWARE, registerreadplayer(), sessionkey, payload)
}

export function applywanixdropdone(
  device: DEVICELIKE,
  player: string,
  result: {
    taskid?: unknown
    cmd?: unknown
    spawns?: unknown
  },
): void {
  const spawns = Array.isArray(result.spawns) ? result.spawns : []
  for (const spawn of spawns) {
    if (!spawn || typeof spawn !== 'object') {
      continue
    }
    const entry = spawn as { taskid?: unknown; cmd?: unknown }
    if (typeof entry.taskid !== 'string' || typeof entry.cmd !== 'string') {
      continue
    }
    setwanixroomconfig({
      ...readwanixroomconfig(),
      mode:
        readwanixroomconfig().mode === 'idle'
          ? 'task'
          : readwanixroomconfig().mode,
      tasks: [
        ...readwanixroomconfig().tasks.filter(
          (task) => task.id !== entry.taskid,
        ),
        { id: entry.taskid, cmd: entry.cmd, running: true },
      ],
    })
  }
  if (typeof result.taskid === 'string') {
    apilog(device, player, `wanix drop done task=${result.taskid}`)
  }
  void activatewanixzedcafeexport(device, player)
}

export function startwanixvm(
  mem = DEFAULT_WANIX_VM_MEM,
  vmid = DEFAULT_WANIX_VM_ID,
  device?: DEVICELIKE,
  player?: string,
): void {
  let zedcafe: WanixZedCafeRoomSpec | null | undefined
  if (device && player) {
    const boot = readwanixbootzedcafestate()
    if (boot) {
      zedcafe = {
        cmd: boot.cmd,
        generation: boot.generation,
      }
    }
  }
  startwanixvmroom(vmid, mem, zedcafe)
}

export function stopwanixvm(vmid = DEFAULT_WANIX_VM_ID): void {
  const config = readwanixroomconfig()
  if (config.mode !== 'vm') {
    return
  }
  if (config.vm?.id && config.vm.id !== vmid) {
    return
  }
  stopwanixvmroom()
}
