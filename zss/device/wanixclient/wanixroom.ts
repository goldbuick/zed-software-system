import type { DEVICELIKE } from 'zss/device/api'
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
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  clearlasthostpushdoc,
  readpendingapplyconfig,
  readpendingspawn,
  readwanixroomconfig as readwanixroomconfigstate,
  setpendingapplyconfig,
  setpendingspawn,
  wanixroomconfigbox,
} from 'zss/device/wanixclient/state'
import { activatewanixzedcafeexport } from 'zss/device/wanixclient/wanixactivateexport'
import { registerwanixsessioncloseprune } from 'zss/device/wanixclient/wanixbridge'
import {
  readwanixbootzedcafestate,
  resetwanixzedcafeonidle,
} from 'zss/device/wanixclient/wanixzedcafe'
import type { WanixTaskDriver } from 'zss/feature/wanix/wanixelements.d.ts'
import type {
  WanixBindDropPayload,
  WanixRoomConfig,
} from 'zss/feature/wanix/wanixroomtypes'
import {
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
  createidleroomconfig,
} from 'zss/feature/wanix/wanixroomtypes'
import { wanixperfmark } from 'zss/feature/wanix/wanixperf'
import type { WanixZedCafeRoomSpec } from 'zss/feature/wanix/wanixzedcafetypes'

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
  wanixroomconfigbox.current = config
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
      wanixroomconfigbox.current = pending
      setpendingapplyconfig(null)
    }
  }
  // Pending can be overwritten by a later applyroom; restore from iframe result
  // before activate so iswanixspaceactive() is true and push is not deferred.
  if (res?.mode === 'vm' || res?.mode === 'task') {
    const boot = readwanixbootzedcafestate()
    const base = wanixroomconfigbox.current
    if (base.mode !== res.mode || !base.zedcafe?.cmd) {
      wanixroomconfigbox.current = {
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
      }
    }
  }
  const config = wanixroomconfigbox.current
  const mode = typeof res?.mode === 'string' ? res.mode : config.mode
  // Iframe applyroom replies often arrive with empty player (see filter.ts).
  const activateplayer = player || registerreadplayer()
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
  if (wanixroomconfigbox.current.mode !== 'idle') {
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
  const next: WanixRoomConfig = {
    ...bumpmountkey(wanixroomconfigbox.current),
    mode: 'task',
    archives: [],
    remotes: [],
    tasks: [],
    vm: undefined,
    zedcafe,
  }
  applywanixroom(next)
}

export function startwanixvmroom(
  vmid = DEFAULT_WANIX_VM_ID,
  mem = DEFAULT_WANIX_VM_MEM,
  zedcafe?: WanixZedCafeRoomSpec | null,
): void {
  if (
    wanixroomconfigbox.current.mode === 'vm' &&
    wanixroomconfigbox.current.vm?.active &&
    wanixroomconfigbox.current.vm.id === vmid &&
    wanixroomconfigbox.current.vm.mem === mem
  ) {
    wanixserverreadvmstatus(SOFTWARE, registerreadplayer())
    return
  }
  const next: WanixRoomConfig = {
    ...bumpmountkey(wanixroomconfigbox.current),
    mode: 'vm',
    archives: wanixroomconfigbox.current.archives,
    remotes: wanixroomconfigbox.current.remotes,
    tasks: [],
    vm: { id: vmid, mem, active: true },
    zedcafe: zedcafe ?? wanixroomconfigbox.current.zedcafe,
  }
  applywanixroom(next)
}

export function stopwanixvmroom(): void {
  wanixserverstopvm(SOFTWARE, registerreadplayer())
  wanixroomconfigbox.current = {
    ...wanixroomconfigbox.current,
    mode: 'task',
    vm: undefined,
  }
}

export function stopwanixroom(hard = false): void {
  resetwanixzedcafeonidle()
  const next = createidleroomconfig()
  next.mountkey = hard
    ? wanixroomconfigbox.current.mountkey + 1
    : wanixroomconfigbox.current.mountkey
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
  wanixroomconfigbox.current = {
    ...wanixroomconfigbox.current,
    tasks: [
      ...wanixroomconfigbox.current.tasks.filter((task) => task.id !== taskid),
      { id: taskid, cmd, running: true },
    ],
  }
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
      wanixroomconfigbox.current = {
        ...wanixroomconfigbox.current,
        tasks: wanixroomconfigbox.current.tasks.filter(
          (task) => task.id !== taskid,
        ),
      }
    }
  }
  setpendingspawn(null)
}

export function halttaskinroom(taskid: string): void {
  if (wanixroomconfigbox.current.mode === 'idle') {
    return
  }
  if (!wanixroomconfigbox.current.tasks.some((task) => task.id === taskid)) {
    return
  }
  wanixserverhalttask(SOFTWARE, registerreadplayer(), taskid)
  wanixroomconfigbox.current = {
    ...wanixroomconfigbox.current,
    tasks: wanixroomconfigbox.current.tasks.filter(
      (task) => task.id !== taskid,
    ),
  }
}

export function removewanixroomtask(taskid: string) {
  if (!wanixroomconfigbox.current.tasks.some((task) => task.id === taskid)) {
    return
  }
  wanixroomconfigbox.current = {
    ...wanixroomconfigbox.current,
    tasks: wanixroomconfigbox.current.tasks.filter(
      (task) => task.id !== taskid,
    ),
  }
}

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
    wanixroomconfigbox.current = {
      ...wanixroomconfigbox.current,
      mode:
        wanixroomconfigbox.current.mode === 'idle'
          ? 'task'
          : wanixroomconfigbox.current.mode,
      tasks: [
        ...wanixroomconfigbox.current.tasks.filter(
          (task) => task.id !== entry.taskid,
        ),
        { id: entry.taskid, cmd: entry.cmd, running: true },
      ],
    }
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

registerwanixsessioncloseprune(removewanixroomtask)
