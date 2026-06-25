/**
 * Wanix host (iframe-only).
 *
 * All wanix execution runs in the app-owned child iframe
 * (cafe/wanix-iframe-host.ts). This module is the thin public API that
 * delegates to wanixtermiframehost.ts.
 */
import type { DEVICELIKE } from 'zss/device/api'
import {
  makewanixtaskid,
  normalizewanixcmd,
  uniquewanixtaskid,
} from 'zss/feature/wanix/wanixcmd'
import {
  type WANIX_ATTACH_KIND,
  readwanixattached,
  readwanixattachedkind,
  readwanixtasks,
} from 'zss/feature/wanix/wanixsession'
import {
  iframeapplytermsize,
  iframeattachtarget,
  iframechildlistdir,
  iframechilddommount,
  iframechildmountarchive,
  iframechildputfile,
  iframehalttask,
  iframehaltvm,
  iframepreptaskspace,
  iframeprepvmspace,
  iframespawntask,
  iframespawnvm,
  iframesynctilefromchild,
  iframeterminput,
  iframetermline,
  iswanixtermiframeactive,
  iswanixtermiframemode,
  readwanixtermiframelayout,
  readwanixtermiframepreperror,
  readwanixtermiframeprepstage,
  teardownwanixtermiframe,
} from 'zss/feature/wanix/wanixtermiframehost'
import type { WANIX_VM_PREP_STAGE } from 'zss/feature/wanix/wanixtermiframeprotocol'
import {
  type WANIX_VM_ASSET_URLS,
  readwanixvmasseturls,
} from 'zss/feature/wanix/wanixvmassets'

export type WANIX_HOST_STATE = 'idle' | 'starting' | 'ready'

export type WANIX_TASK_ENTRY = {
  id: string
  cmd: string
  rid?: string
  running: boolean
  attached: boolean
}

export type WANIX_VM_ENTRY = {
  id: string
  mem: string
  vrid?: string
  running: boolean
  attached: boolean
}

let state: WANIX_HOST_STATE = 'idle'

function requireactive() {
  if (iswanixtermiframemode() && iswanixtermiframeactive()) {
    return
  }
  throw new Error('wanix not running — drop a .wasm to start')
}

function cleanup() {
  void teardownwanixtermiframe()
  state = 'idle'
}

export function readwanixhoststate(): WANIX_HOST_STATE {
  return state
}

export function iswanixspaceactive(): boolean {
  if (iswanixtermiframemode() && iswanixtermiframeactive()) {
    return true
  }
  return state === 'ready' || state === 'starting'
}

export function readwanixvmprepstage(): WANIX_VM_PREP_STAGE {
  return readwanixtermiframeprepstage()
}

export function readwanixvmpreperror(): string | undefined {
  return readwanixtermiframepreperror()
}

export async function spawnwanixspace(
  device: DEVICELIKE,
  player: string,
): Promise<void> {
  void device
  void player
  if (iswanixtermiframeactive() && readwanixtermiframelayout() === 'task') {
    return
  }
  if (iswanixtermiframeactive()) {
    await teardownwanixtermiframe()
  }
  state = 'starting'
  try {
    await iframepreptaskspace()
    state = 'ready'
  } catch (err) {
    cleanup()
    throw err
  }
}

export async function spawnwanixvmspace(
  device: DEVICELIKE,
  player: string,
  urls: WANIX_VM_ASSET_URLS = readwanixvmasseturls(),
): Promise<void> {
  if (readwanixtermiframelayout() === 'vm') {
    return
  }
  if (iswanixtermiframeactive()) {
    await teardownwanixtermiframe()
  }
  state = 'starting'
  await iframeprepvmspace(device, player, urls)
  state = 'ready'
}

export async function ensurewanixsandbox(
  device: DEVICELIKE,
  player: string,
): Promise<void> {
  if (!iswanixspaceactive()) {
    await spawnwanixspace(device, player)
  }
}

export type SPAWN_WANIX_TASK_OPTS = {
  taskid?: string
  attach?: boolean
}

export async function spawnwanixtask(
  cmd: string,
  opts: SPAWN_WANIX_TASK_OPTS = {},
): Promise<{ taskid: string; code?: number }> {
  const taskcmd = normalizewanixcmd(cmd)
  if (!taskcmd) {
    throw new Error('empty command')
  }
  requireactive()
  const taskid =
    opts.taskid ??
    uniquewanixtaskid(makewanixtaskid(taskcmd), [
      ...readwanixtasks().map((task) => task.id),
    ])
  if (readwanixtermiframelayout() !== 'task') {
    throw new Error('wanix task space not prepared')
  }
  await iframespawntask(taskid, taskcmd, opts.attach !== false)
  return { taskid }
}

export async function putwanixfile(name: string, bytes: Uint8Array) {
  requireactive()
  await iframechildputfile(name, bytes)
}

export async function mountwanixdom() {
  requireactive()
  await iframechilddommount()
}

export async function mountwanixarchive(
  name: string,
  bytes: Uint8Array,
  mountdst?: string,
) {
  requireactive()
  const dst = mountdst ?? '.'
  await iframechildmountarchive(name, bytes, dst)
  return dst
}

export async function listwanixdir(path: string): Promise<string[]> {
  requireactive()
  return iframechildlistdir(path)
}

export async function haltwanixtask(taskid?: string): Promise<void> {
  if (iswanixtermiframeactive()) {
    await iframehalttask(taskid)
  }
}

export async function attachwanixtarget(
  kind: WANIX_ATTACH_KIND,
  id: string,
): Promise<void> {
  requireactive()
  await iframeattachtarget(kind, id)
}

export async function sendwanixterminput(text: string): Promise<void> {
  requireactive()
  if (!text.length) {
    return
  }
  return iframeterminput(text)
}

export async function sendwanixtermwrite(line: string): Promise<void> {
  requireactive()
  return iframetermline(line)
}

/** Sync the guest terminal size to the visible tile (host sizes the iframe). */
export function wanixhostapplytermsize(cols: number, rows: number) {
  if (cols <= 0 || rows <= 0) {
    return
  }
  iframeapplytermsize(cols, rows)
}

/** Re-mirror iframe xterm cells onto the tile after a local buffer resize. */
export async function wanixhostsynctilefromchild(): Promise<void> {
  if (!iswanixtermiframeactive()) {
    return
  }
  await iframesynctilefromchild()
}

export type SPAWN_WANIX_VM_OPTS = {
  vmid?: string
  mem?: string
  attach?: boolean
}

export async function spawnwanixvm(
  opts: SPAWN_WANIX_VM_OPTS = {},
): Promise<{ vmid: string; code?: number }> {
  requireactive()
  return iframespawnvm(opts)
}

export async function haltwanixvm(vmid?: string): Promise<void> {
  if (iswanixtermiframeactive()) {
    await iframehaltvm(vmid)
  }
}

export function readwanixstatus(): {
  active: boolean
  ready: boolean
  state: WANIX_HOST_STATE
  taskactive?: boolean
  vmactive?: boolean
  vmbindsready?: boolean
  vmprepstage?: WANIX_VM_PREP_STAGE
  vmpreperror?: string
  attachedId?: string
  attachedKind?: WANIX_ATTACH_KIND
  attachedTaskId?: string
  tasks?: WANIX_TASK_ENTRY[]
  vms?: WANIX_VM_ENTRY[]
} {
  if (iswanixtermiframemode() && iswanixtermiframeactive()) {
    return {
      active: true,
      ready: true,
      state: 'ready',
      vmbindsready: true,
      vmprepstage: readwanixtermiframeprepstage(),
      vmpreperror: readwanixtermiframepreperror(),
      attachedId: readwanixattached() ?? undefined,
      attachedKind: readwanixattachedkind() ?? undefined,
    }
  }
  return {
    active: iswanixspaceactive(),
    ready: false,
    state,
    vmprepstage: readwanixtermiframeprepstage(),
    vmpreperror: readwanixtermiframepreperror(),
  }
}
