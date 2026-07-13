import type { WanixZedCafeRoomSpec } from 'zss/feature/wanix/wanixzedcafetypes'

export type WanixRoomMode = 'idle' | 'task' | 'vm'

export type WanixArchiveSpec = {
  id: string
  dst: string
  src: string
}

export type WanixRemoteSpec = {
  id: string
  dst: string
  url: string
}

export type WanixTaskSpec = {
  id: string
  cmd: string
  running?: boolean
}

export type WanixVmSpec = {
  id: string
  mem: string
  active: boolean
}

export type WanixRoomConfig = {
  mode: WanixRoomMode
  mountkey: number
  archives: WanixArchiveSpec[]
  remotes: WanixRemoteSpec[]
  tasks: WanixTaskSpec[]
  vm?: WanixVmSpec
  zedcafe?: WanixZedCafeRoomSpec | null
  /** Force full iframe remount (hard idle). */
  hardreset?: boolean
}

export type WanixRoomStatus = WanixRoomConfig & {
  ready: boolean
}

export type WanixMenuVmStatus = {
  running: boolean
  vmid: string | null
  vrid: string | null
  mem: string | null
}

export type WanixMenuState = {
  config: WanixRoomConfig
  ready: boolean
  vmrunning: boolean
  vm: WanixMenuVmStatus | null
  stalled: boolean
  sessionkeys: string[]
  activesessionkey: string | null
}

export type WanixSpawnTaskResult = {
  ok: boolean
  taskid: string
  rid?: string | null
}

export type WanixDropPayload = {
  label: string
  kind: 'wasm' | 'bundle'
  bytes: Uint8Array
}

export type WanixBindDropKind = 'file' | 'archive'

export type WanixBindDropPayload = {
  label: string
  kind: WanixBindDropKind
  bytes: Uint8Array
  dst: string
  perm: string
}

export const WANIX_LINUX_ARCHIVE_URL =
  'https://cdn.jsdelivr.net/npm/wanix-extras@0.4.0-rc1/dist/wanix-linux.tgz'

export const WANIX_ZEDCAFE_LINUX_OVERLAY_URL =
  '/wanix/zedcafe-linux-overlay.tgz'

export const WANIX_V86_ARCHIVE_URL =
  'https://cdn.jsdelivr.net/npm/wanix-extras@0.4.0-rc1/dist/v86.tgz'

export const DEFAULT_WANIX_VM_ID = 'linux-vm'
export const DEFAULT_WANIX_VM_MEM = '512M'
/** Default mount dst for `#wanix remote connect` (no leading `/`, no spaces). */
export const DEFAULT_WANIX_REMOTE_DST = 'remote'

export function createidleroomconfig(): WanixRoomConfig {
  return {
    mode: 'idle',
    mountkey: 0,
    archives: [],
    remotes: [],
    tasks: [],
  }
}
