import type { DEVICELIKE } from 'zss/device/api'
import {
  apilog,
  wanixserverapplyroom,
  wanixserverbinddrop,
  wanixserverhalttask,
  wanixserverreadroomstatus,
  wanixserverreadvmstatus,
  wanixserverspawntask,
  wanixserverstopvm,
  wanixserverwritefile,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  readpendingapplyconfig,
  readpendingmenu,
  readpendingspawn,
  readwanixroomconfig as readwanixroomconfigstate,
  setpendingapplyconfig,
  setpendingmenu,
  setpendingspawn,
  wanixroomconfigbox,
} from 'zss/device/wanixclient/state'
import { activatewanixzedcafeexport } from 'zss/device/wanixclient/wanixactivateexport'
import { registerwanixsessioncloseprune } from 'zss/device/wanixclient/wanixbridge'
import {
  readattachedsession,
  readwanixactivesession,
} from 'zss/device/wanixclient/wanixdisplay'
import { readwanixtermbufferkeys } from 'zss/device/wanixclient/wanixtermbuffer'
import {
  readwanixbootzedcafestate,
  resetwanixzedcafeonidle,
} from 'zss/device/wanixclient/wanixzedcafe'
import type { WanixTaskDriver } from 'zss/feature/wanix/wanixelements.d.ts'
import type {
  WanixBindDropPayload,
  WanixMenuState,
  WanixMenuVmStatus,
  WanixRoomConfig,
  WanixRoomStatus,
} from 'zss/feature/wanix/wanixroomtypes'
import {
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
  createidleroomconfig,
} from 'zss/feature/wanix/wanixroomtypes'
import type { WanixZedCafeRoomSpec } from 'zss/feature/wanix/wanixzedcafetypes'

function bumpmountkey(config: WanixRoomConfig): WanixRoomConfig {
  return { ...config, mountkey: config.mountkey + 1, hardreset: true }
}

export function readwanixroomconfig(): WanixRoomConfig {
  return readwanixroomconfigstate()
}

export function applywanixroom(config: WanixRoomConfig): void {
  setpendingapplyconfig(config)
  wanixroomconfigbox.current = config
  wanixserverapplyroom(SOFTWARE, registerreadplayer(), config)
}

export function applywanixroomresult(): void {
  const pending = readpendingapplyconfig()
  if (pending) {
    wanixroomconfigbox.current = pending
    setpendingapplyconfig(null)
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
  if (device && player) {
    void activatewanixzedcafeexport(device, player)
  }
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

function readwanixmenusessionfields() {
  return {
    sessionkeys: readwanixtermbufferkeys(),
    attachedsessionkey: readattachedsession(),
    activesessionkey: readwanixactivesession(),
  }
}

function readwanixmenufallbackvm(): WanixMenuVmStatus | null {
  const vm = wanixroomconfigbox.current.vm
  if (!vm?.active) {
    return null
  }
  return {
    running: true,
    vmid: vm.id,
    vrid: null,
    mem: vm.mem,
  }
}

function buildmenufrompending(): WanixMenuState {
  const config = readwanixroomconfig()
  const pending = readpendingmenu()
  const roomstatus = pending?.roomstatus
  const vmstatus = pending?.vmstatus
  if (pending?.stalled || (!roomstatus && !vmstatus)) {
    const fallbackvm = readwanixmenufallbackvm()
    return {
      config,
      ready: false,
      vmrunning: !!fallbackvm?.running,
      vm: fallbackvm,
      stalled: true,
      ...readwanixmenusessionfields(),
    }
  }
  const vmrunning = roomstatus?.vmrunning ?? vmstatus?.running ?? false
  return {
    config: {
      ...config,
      mode: roomstatus?.mode ?? config.mode,
      tasks: roomstatus?.tasks ?? config.tasks,
      vm: roomstatus?.vm ?? config.vm,
    },
    ready: roomstatus?.ready ?? false,
    vmrunning,
    vm: vmrunning || vmstatus?.running ? (vmstatus ?? null) : null,
    stalled: false,
    ...readwanixmenusessionfields(),
  }
}

function maybeflushmenu() {
  const pending = readpendingmenu()
  if (!pending?.player) {
    return
  }
  if (!pending.roomstatus || !pending.vmstatus) {
    return
  }
  const player = pending.player
  const state = buildmenufrompending()
  setpendingmenu(null)
  void import('zss/device/wanixclient/wanixmenu').then(
    ({ buildwanixmenutape }) => {
      void import('zss/feature/terminalwritelines').then(
        ({ terminalwritelines }) => {
          terminalwritelines(SOFTWARE, player, buildwanixmenutape(state))
        },
      )
    },
  )
}

export function requestwanixmenustate(player: string): void {
  const config = readwanixroomconfig()
  if (config.mode === 'idle') {
    void import('zss/device/wanixclient/wanixmenu').then(
      ({ buildwanixmenutape }) => {
        void import('zss/feature/terminalwritelines').then(
          ({ terminalwritelines }) => {
            terminalwritelines(
              SOFTWARE,
              player,
              buildwanixmenutape({
                config,
                ready: false,
                vmrunning: false,
                vm: null,
                stalled: false,
                ...readwanixmenusessionfields(),
              }),
            )
          },
        )
      },
    )
    return
  }
  setpendingmenu({ player })
  wanixserverreadroomstatus(SOFTWARE, player)
  wanixserverreadvmstatus(SOFTWARE, player)
}

export function applywanixroomstatus(data: unknown): void {
  const pending = readpendingmenu()
  if (!pending) {
    return
  }
  if (
    data &&
    typeof data === 'object' &&
    (data as { ok?: unknown }).ok === false
  ) {
    pending.stalled = true
    pending.roomstatus = {
      ...readwanixroomconfig(),
      ready: false,
    }
    maybeflushmenu()
    return
  }
  pending.roomstatus = data as WanixRoomStatus & { vmrunning?: boolean }
  maybeflushmenu()
}

export function applywanixvmstatus(data: unknown): void {
  const pending = readpendingmenu()
  if (!pending) {
    return
  }
  if (
    data &&
    typeof data === 'object' &&
    (data as { ok?: unknown }).ok === false
  ) {
    pending.stalled = true
    pending.vmstatus = {
      running: false,
      vmid: null,
      vrid: null,
      mem: null,
    }
    maybeflushmenu()
    return
  }
  pending.vmstatus = data as WanixMenuVmStatus
  maybeflushmenu()
}

/** Sync snapshot for tests / callers that still need local menu fields. */
export function readwanixmenustate(): WanixMenuState {
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
  const fallbackvm = readwanixmenufallbackvm()
  return {
    config,
    ready: false,
    vmrunning: !!fallbackvm?.running,
    vm: fallbackvm,
    stalled: false,
    ...readwanixmenusessionfields(),
  }
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
  if (device && player) {
    void activatewanixzedcafeexport(device, player)
  }
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
