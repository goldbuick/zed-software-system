import type { WanixTaskDriver } from 'zss/feature/wanix/wanixelements.d.ts'
import type { WanixBindDropPayload } from 'zss/feature/wanix/wanixroomtypes'
import type { WanixRoomConfig } from 'zss/feature/wanix/wanixroomtypes'
import type { WanixZedCafeGuestFile } from 'zss/feature/wanix/wanixzedcafetypes'

export type WANIX_IFRAME_HOST = {
  ping: () => { ok: boolean }
  readready: () => { isReady: boolean; instanceID: string | null }
  readroomstatus: () => unknown
  readvmstatus: () => unknown
  applyroom: (config: WanixRoomConfig) => Promise<unknown>
  spawntask: (
    taskid: string,
    cmd: string,
    driverhint?: WanixTaskDriver | null,
  ) => Promise<unknown>
  halttask: (taskid: string) => unknown
  stoproom: () => Promise<unknown>
  startvm: (mem?: string, vmid?: string) => Promise<unknown>
  stopvm: () => unknown
  listdir: (path?: string) => Promise<unknown>
  readtext: (path: string) => Promise<unknown>
  readfile: (path: string) => Promise<number[]>
  writefile: (path: string, bytes?: number[]) => Promise<unknown>
  binddrop: (sessionkey: string, spec: WanixBindDropPayload) => unknown
  termwrite: (linedata?: string, sessionkey?: string) => Promise<unknown>
  termfit: (cols: number, rows: number) => unknown
  waitzedcafecontentready: (
    taskrid: string,
    timeoutms?: number,
  ) => Promise<boolean>
  setzedcafeready: (ready: boolean) => unknown
  haltzedcafe: () => unknown
  readzedcafetaskrid: () => string | null
  readzedcafeexportfiles: () => Promise<unknown>
  synczedcafeexport: (
    files?: { path: string; data: number[] }[] | null,
    removepaths?: string[] | null,
  ) => Promise<unknown>
  iszedcafeexportlive: (taskrid?: string) => Promise<boolean>
  iszedcafeguestbound: () => Promise<boolean>
  requestzedcafestate: () => Promise<WanixZedCafeGuestFile[]>
}

let host: WANIX_IFRAME_HOST | null = null

export function registerwanixiframehost(next: WANIX_IFRAME_HOST): void {
  host = next
}

export function readwanixiframehost(): WANIX_IFRAME_HOST {
  if (!host) {
    throw new Error('wanix iframe host not registered')
  }
  return host
}
