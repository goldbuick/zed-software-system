/**
 * Shared mutable state for the wanixclient (parent) device.
 * Used by wanixclient handlers and parent coordinators (room, zedcafe, display, bridge).
 */

import type { WANIX_ZED_CAFE_IMPORT_RESULT } from 'zss/device/api'
import type { DEVICELIKE, MESSAGE } from 'zss/device/messagetypes'
import type {
  WanixMenuVmStatus,
  WanixRoomConfig,
  WanixRoomStatus,
} from 'zss/feature/wanix/wanixroomtypes'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'
import type { WANIX_ZED_CAFE_EXPORT_FILE } from 'zss/feature/wanix/wanixstateexport'
import type { WanixTermCellsSnapshot } from 'zss/feature/wanix/wanixtermgridstate'
import { deepcopy } from 'zss/mapping/types'

// --- types ---

export type WanixSessionMeta = {
  sessionkey: string
  attached: boolean
  active: boolean
  cols: number
  rows: number
  scrollbackrows: number
  digest: string
  version: number
  altactive: boolean
  bracketedpaste: boolean
  label: string
}

export type WanixTermTileBuffer = WanixTermCellsSnapshot & {
  version: number
}

export type WanixTermScrollState = {
  totallines: number
  maxoffset: number
  startline: number
  atliveline: boolean
  clampedoffset: number
}

export type WanixTermScrollTarget = 'top' | 'live'

export type WanixTermCellPos = {
  line: number
  col: number
}

export type WanixReadyCallback = () => void

export type WanixBridgeState = {
  childwindow: Window | null
  childwindowwaiters: (() => void)[]
  wanixisready: boolean
  readylisteners: WanixReadyCallback[]
  deliverwanixmessage: ((message: MESSAGE) => void) | null
}

export type PendingMenu = {
  player: string
  roomstatus?: WanixRoomStatus & { vmrunning?: boolean }
  vmstatus?: WanixMenuVmStatus
  stalled?: boolean
}

export type PushZedCafeSyncOptions = {
  fromimport?: boolean
  partial?: boolean
  nextdoc?: Record<string, unknown>
  removepaths?: string[]
}

export type Pendingsync = {
  device: DEVICELIKE
  player: string
  files: WANIX_ZED_CAFE_EXPORT_FILE[]
  options?: PushZedCafeSyncOptions
  shadowdoc: Record<string, unknown>
  memcount: number
  phase: 'guesttree' | 'sync' | 'contentready'
  taskrid?: string | null
}

export type VmZedCafeExportWaiter = {
  resolve: (files: WANIX_ZED_CAFE_EXPORT_FILE[]) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export type VmZedCafeImportWaiter = {
  resolve: (result: WANIX_ZED_CAFE_IMPORT_RESULT) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export type PendingPollPhase = 'taskrid' | 'live' | 'tree' | null

// --- room config ---

export const wanixroomconfigbox: { current: WanixRoomConfig } = {
  current: createidleroomconfig(),
}

export function readwanixroomconfig(): WanixRoomConfig {
  return wanixroomconfigbox.current
}

export function setwanixroomconfig(next: WanixRoomConfig): void {
  wanixroomconfigbox.current = next
}

// --- attach / session display keys ---

let attachedsessionkey: string | null = null
let activesessionkey: string | null = null
let userdetached = false
const attachlisteners = new Set<() => void>()
let onsessioncloseprune: ((sessionkey: string) => void) | null = null

export function bumpattach(): void {
  for (const listener of attachlisteners) {
    listener()
  }
}

export function readwanixactivesession(): string | null {
  return activesessionkey
}

export function setwanixactivesessionkey(next: string | null): void {
  activesessionkey = next
}

export function readattachedsession(): string | null {
  return attachedsessionkey
}

export function setattachedsessionkey(next: string | null): void {
  attachedsessionkey = next
}

export function readuserdetached(): boolean {
  return userdetached
}

export function setuserdetached(next: boolean): void {
  userdetached = next
}

export function subscribewanixattach(listener: () => void) {
  attachlisteners.add(listener)
  return () => {
    attachlisteners.delete(listener)
  }
}

export function clearattachlisteners(): void {
  attachlisteners.clear()
}

export function registerwanixsessioncloseprune(
  fn: (sessionkey: string) => void,
): void {
  onsessioncloseprune = fn
}

export function readonsessioncloseprune():
  | ((sessionkey: string) => void)
  | null {
  return onsessioncloseprune
}

export function resetwanixattachforidle(): void {
  attachedsessionkey = null
  activesessionkey = null
  userdetached = false
  bumpattach()
}

export function resetwanixattachstatefortest(): void {
  attachedsessionkey = null
  activesessionkey = null
  userdetached = false
  attachlisteners.clear()
  onsessioncloseprune = null
}

// --- term tile buffers ---

const termbuffers = new Map<string, WanixTermTileBuffer>()
const opensessions = new Set<string>()
const termbufferlisteners = new Set<() => void>()
let termnotifyversion = 0

export function bumptermbuffer(): void {
  termnotifyversion += 1
  for (const listener of termbufferlisteners) {
    listener()
  }
}

export function readtermbuffers(): Map<string, WanixTermTileBuffer> {
  return termbuffers
}

export function readopensessions(): Set<string> {
  return opensessions
}

export function readwanixtermbuffer(
  sessionkey: string,
): WanixTermTileBuffer | null {
  return termbuffers.get(sessionkey) ?? null
}

export function setwanixtermbuffer(
  sessionkey: string,
  buffer: WanixTermTileBuffer,
): void {
  termbuffers.set(sessionkey, buffer)
}

export function deletewanixtermbuffer(sessionkey: string): boolean {
  return termbuffers.delete(sessionkey)
}

export function clearwanixtermbuffersstore(): void {
  termbuffers.clear()
  opensessions.clear()
}

export function hasopensession(sessionkey: string): boolean {
  return opensessions.has(sessionkey)
}

export function addopensession(sessionkey: string): void {
  opensessions.add(sessionkey)
}

export function deleteopensession(sessionkey: string): boolean {
  return opensessions.delete(sessionkey)
}

export function readwanixtermbufferkeys(): string[] {
  return [...new Set([...opensessions, ...termbuffers.keys()])]
}

export function readwanixtermnotifyversion(): number {
  return termnotifyversion
}

export function subscribewanixtermbuffer(listener: () => void) {
  termbufferlisteners.add(listener)
  return () => {
    termbufferlisteners.delete(listener)
  }
}

export function resetwanixtermbufferfortest(): void {
  termbuffers.clear()
  opensessions.clear()
  termbufferlisteners.clear()
  termnotifyversion = 0
}

// --- bridge ready / iframe window ---

const WANIX_BRIDGE_STATE_KEY = '__zss_wanix_bridge_state__'

export function readbridgestate(): WanixBridgeState {
  const g = globalThis as Record<string, unknown>
  let state = g[WANIX_BRIDGE_STATE_KEY] as WanixBridgeState | undefined
  if (!state) {
    state = {
      childwindow: null,
      childwindowwaiters: [],
      wanixisready: false,
      readylisteners: [],
      deliverwanixmessage: null,
    }
    g[WANIX_BRIDGE_STATE_KEY] = state
  }
  return state
}

export function iswanixready(): boolean {
  return readbridgestate().wanixisready
}

export function setwanixreadyflag(ready: boolean): void {
  readbridgestate().wanixisready = ready
}

export function resetwanixbridgefortest(): void {
  const state = readbridgestate()
  state.childwindow = null
  state.childwindowwaiters = []
  state.wanixisready = false
  state.readylisteners = []
  state.deliverwanixmessage = null
}

// --- room pending (menu / apply / spawn) ---

let pendingmenu: PendingMenu | null = null
let pendingapplyconfig: WanixRoomConfig | null = null
let pendingspawn: { taskid: string; cmd: string } | null = null

export function readpendingmenu(): PendingMenu | null {
  return pendingmenu
}

export function setpendingmenu(next: PendingMenu | null): void {
  pendingmenu = next
}

export function readpendingapplyconfig(): WanixRoomConfig | null {
  return pendingapplyconfig
}

export function setpendingapplyconfig(next: WanixRoomConfig | null): void {
  pendingapplyconfig = next
}

export function readpendingspawn(): { taskid: string; cmd: string } | null {
  return pendingspawn
}

export function setpendingspawn(
  next: { taskid: string; cmd: string } | null,
): void {
  pendingspawn = next
}

export function resetwanixroompendingfortest(): void {
  pendingmenu = null
  pendingapplyconfig = null
  pendingspawn = null
}

// --- zedcafe session + pending sync/poll/waiters ---

let lasthostpushdoc: Record<string, unknown> = {}
let pollactive = false
let guestdirty = false

let pendingexport = false
let polltimer: ReturnType<typeof setInterval> | undefined
let polldevice: DEVICELIKE | null = null
let pollplayer = ''
let pendingexportwait: VmZedCafeExportWaiter | null = null
let pendingimportwait: VmZedCafeImportWaiter | null = null
let pendingsync: Pendingsync | null = null
let pendingpollphase: PendingPollPhase = null

export function readlasthostpushdoc(): Record<string, unknown> {
  return lasthostpushdoc
}

export function setlasthostpushdoc(doc: Record<string, unknown>): void {
  lasthostpushdoc = deepcopy(doc)
}

export function clearlasthostpushdoc(): void {
  lasthostpushdoc = {}
}

export function readzedcafepollactive(): boolean {
  return pollactive
}

export function setzedcafepollactive(active: boolean): void {
  pollactive = active
}

export function readzedcafeguestdirty(): boolean {
  return guestdirty
}

export function setzedcafeguestdirty(dirty: boolean): void {
  guestdirty = dirty
}

export function readwanixzedcafependingexport(): boolean {
  return pendingexport
}

export function markwanixzedcafependingexport(): void {
  pendingexport = true
}

export function clearwanixzedcafependingexport(): void {
  pendingexport = false
}

export function readpolltimer(): ReturnType<typeof setInterval> | undefined {
  return polltimer
}

export function setpolltimer(
  next: ReturnType<typeof setInterval> | undefined,
): void {
  polltimer = next
}

export function readpolldevice(): DEVICELIKE | null {
  return polldevice
}

export function setpolldevice(next: DEVICELIKE | null): void {
  polldevice = next
}

export function readpollplayer(): string {
  return pollplayer
}

export function setpollplayer(next: string): void {
  pollplayer = next
}

export function readpendingexportwait(): VmZedCafeExportWaiter | null {
  return pendingexportwait
}

export function setpendingexportwait(next: VmZedCafeExportWaiter | null): void {
  pendingexportwait = next
}

export function readpendingimportwait(): VmZedCafeImportWaiter | null {
  return pendingimportwait
}

export function setpendingimportwait(next: VmZedCafeImportWaiter | null): void {
  pendingimportwait = next
}

export function readpendingsync(): Pendingsync | null {
  return pendingsync
}

export function setpendingsync(next: Pendingsync | null): void {
  pendingsync = next
}

export function readpendingpollphase(): PendingPollPhase {
  return pendingpollphase
}

export function setpendingpollphase(next: PendingPollPhase): void {
  pendingpollphase = next
}

export function resetwanixzedcafesessionfortest(): void {
  lasthostpushdoc = {}
  pollactive = false
  guestdirty = false
}

export function resetwanixzedcafependingfortest(): void {
  pendingexport = false
  if (polltimer) {
    clearInterval(polltimer)
  }
  polltimer = undefined
  polldevice = null
  pollplayer = ''
  if (pendingexportwait) {
    clearTimeout(pendingexportwait.timer)
  }
  if (pendingimportwait) {
    clearTimeout(pendingimportwait.timer)
  }
  pendingexportwait = null
  pendingimportwait = null
  pendingsync = null
  pendingpollphase = null
}

/** Test hook — resets all wanixclient device state. */
export function resetwanixclientstatefortest(): void {
  wanixroomconfigbox.current = createidleroomconfig()
  resetwanixattachstatefortest()
  resetwanixtermbufferfortest()
  resetwanixbridgefortest()
  resetwanixroompendingfortest()
  resetwanixzedcafesessionfortest()
  resetwanixzedcafependingfortest()
}
