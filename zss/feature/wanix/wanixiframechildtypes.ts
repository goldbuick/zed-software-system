import type { WANIX_VM_ASSET_URLS } from 'zss/feature/wanix/wanixvmassets'

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
}

export type WanixRoot = {
  readDir: (path: string) => Promise<string[]>
  readFile: (path: string) => Promise<Uint8Array | string>
  writeFile: (path: string, data: string | Uint8Array) => Promise<void>
}

export type WanixSystemElement = HTMLElement & {
  root?: WanixRoot
}

export type WanixTaskElement = HTMLElement & {
  rid?: string | null
  allocate?: () => Promise<void>
  start?: () => Promise<void>
}

export type WanixWakeElement = HTMLElement & {
  rid?: string | null
  term?: string
}

export type WanixIframeArchive = {
  id: string
  name: string
  src: string
  mountdst: string
}

type WanixIframeBase = {
  mountKey: number
  archives: WanixIframeArchive[]
  zedcafe: WanixZedCafeHostState | null
}

export type WanixIframeHostState =
  | ({ phase: 'idle' } & WanixIframeBase)
  | ({ phase: 'vm-prepared'; urls: WANIX_VM_ASSET_URLS } & WanixIframeBase)
  | ({ phase: 'task-system' } & WanixIframeBase)
  | ({ phase: 'task-ready' } & WanixIframeBase)
  | ({
      phase: 'task-active'
      taskid: string
      cmd: string
    } & WanixIframeBase)
  | ({
      phase: 'vm-active'
      urls: WANIX_VM_ASSET_URLS
      vmid: string
      mem: string
    } & WanixIframeBase)

export function createidlewanixiframestate(): WanixIframeHostState {
  return { phase: 'idle', mountKey: 0, archives: [], zedcafe: null }
}
