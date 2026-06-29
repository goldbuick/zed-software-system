import type { WANIX_VM_ASSET_URLS } from 'zss/feature/wanix/wanixvmassets'
import { readwanixvmasseturls } from 'zss/feature/wanix/wanixvmassets'

export const WANIX_IFRAME_SYSTEM_ID = 'zss-wanix-iframe-sys'

export type WanixZedCafeGuestFile = {
  path: string
  data: number[]
}

export type WanixZedCafeHostState = {
  cmd: string
  generation: number
  ready: boolean
  taskrid: string | null
  guestfiles?: WanixZedCafeGuestFile[]
  inboxbytes?: number[]
}

export type WanixRoot = {
  readDir: (path: string) => Promise<string[]>
  readFile: (path: string) => Promise<Uint8Array | string>
  writeFile: (path: string, data: string | Uint8Array) => Promise<void>
}

export type WanixSystemElement = HTMLElement & {
  root?: WanixRoot
  isReady?: boolean
}

export type WanixTaskElement = HTMLElement & {
  rid?: string | null
  allocate?: () => Promise<void>
  start?: () => Promise<void>
}

export type WanixWakeElement = HTMLElement & {
  rid?: string | null
  term?: string
  start?: () => Promise<void>
}

export type WanixIframeArchive = {
  id: string
  name: string
  src: string
  mountdst: string
}

export type WanixIframeRemote = {
  id: string
  label: string
  url: string
  mountdst: string
}

export type WANIX_ROOM_PHASE = 'idle' | 'booting' | 'ready'

export type WANIX_VM_BOOT_STAGE = 'idle' | 'export' | 'activating' | 'active'

export type WanixVmRoomState = {
  vmid: string
  mem: string
  bootstage: WANIX_VM_BOOT_STAGE
  guestfiles?: WanixZedCafeGuestFile[]
}

export type WanixPendingTaskSpawn = {
  spawnid: number
  taskid: string
  cmd: string
}

export type WanixIframeHostState = {
  room: WANIX_ROOM_PHASE
  urls: WANIX_VM_ASSET_URLS
  vmcapable: boolean
  roommountkey: number
  archives: WanixIframeArchive[]
  remotes: WanixIframeRemote[]
  zedcafe: WanixZedCafeHostState | null
  pendingtasks: WanixPendingTaskSpawn[]
  removetaskids: string[]
  taskspawnseq: number
  vm: WanixVmRoomState | null
  activetargetid: string | null
  activetargetkind: 'task' | 'vm' | null
}

export function createidlewanixiframestate(): WanixIframeHostState {
  return {
    room: 'idle',
    urls: readwanixvmasseturls(),
    vmcapable: false,
    roommountkey: 0,
    archives: [],
    remotes: [],
    zedcafe: null,
    pendingtasks: [],
    removetaskids: [],
    taskspawnseq: 0,
    vm: null,
    activetargetid: null,
    activetargetkind: null,
  }
}

export function iswanixroomready(state: WanixIframeHostState): boolean {
  return state.room === 'ready'
}

export function iswanixvmexportstage(state: WanixIframeHostState): boolean {
  return state.vm?.bootstage === 'export'
}

export function iswanixvmactivating(state: WanixIframeHostState): boolean {
  return (
    state.vm?.bootstage === 'activating' || state.vm?.bootstage === 'active'
  )
}
