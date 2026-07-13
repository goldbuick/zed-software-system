/**
 * Shared mutable state for the wanixclient (parent) device.
 * Store-backed fields live in wanixclientstore; waiters / bridge Window stay here.
 */

import type { WANIX_ZED_CAFE_IMPORT_RESULT } from 'zss/device/api'
import type { DEVICELIKE, MESSAGE } from 'zss/device/types'
import {
  resetwanixclientstore,
  useWanixClient,
} from 'zss/device/wanixclient/wanixclientstore'
import type { WanixRoomConfig } from 'zss/feature/wanix/wanixroomtypes'
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
  phase: 'guesttree' | 'sync'
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

// --- room config (zustand) ---

export function readwanixroomconfig(): WanixRoomConfig {
  return useWanixClient.getState().roomconfig
}

export function setwanixroomconfig(next: WanixRoomConfig): void {
  useWanixClient.setState({ roomconfig: next })
}

// --- attach / session display keys (zustand) ---

export function readwanixactivesession(): string | null {
  return useWanixClient.getState().activesessionkey
}

export function setwanixactivesessionkey(next: string | null): void {
  useWanixClient.setState({ activesessionkey: next })
}

export function readattachedsession(): string | null {
  return useWanixClient.getState().attachedsessionkey
}

export function setattachedsessionkey(next: string | null): void {
  useWanixClient.setState({ attachedsessionkey: next })
}

export function readuserdetached(): boolean {
  return useWanixClient.getState().userdetached
}

export function setuserdetached(next: boolean): void {
  useWanixClient.setState({ userdetached: next })
}

export function subscribewanixattach(listener: () => void) {
  let prev = useWanixClient.getState().attachedsessionkey
  return useWanixClient.subscribe((state) => {
    if (state.attachedsessionkey === prev) {
      return
    }
    prev = state.attachedsessionkey
    listener()
  })
}

let onsessioncloseprune: ((sessionkey: string) => void) | null = null

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
  useWanixClient.setState({
    attachedsessionkey: null,
    activesessionkey: null,
    userdetached: false,
  })
}

export function resetwanixattachstatefortest(): void {
  useWanixClient.setState({
    attachedsessionkey: null,
    activesessionkey: null,
    userdetached: false,
  })
  onsessioncloseprune = null
}

// --- term tile buffers (zustand) ---

export function bumptermbuffer(): void {
  useWanixClient.setState((state) => ({
    termnotifyversion: state.termnotifyversion + 1,
  }))
}

export function readtermbuffers(): Map<string, WanixTermTileBuffer> {
  return useWanixClient.getState().termbuffers
}

export function readopensessions(): Set<string> {
  return useWanixClient.getState().opensessions
}

export function readwanixtermbuffer(
  sessionkey: string,
): WanixTermTileBuffer | null {
  return useWanixClient.getState().termbuffers.get(sessionkey) ?? null
}

export function setwanixtermbuffer(
  sessionkey: string,
  buffer: WanixTermTileBuffer,
): void {
  const termbuffers = new Map(useWanixClient.getState().termbuffers)
  termbuffers.set(sessionkey, buffer)
  useWanixClient.setState({ termbuffers })
}

export function deletewanixtermbuffer(sessionkey: string): boolean {
  const termbuffers = new Map(useWanixClient.getState().termbuffers)
  if (!termbuffers.delete(sessionkey)) {
    return false
  }
  useWanixClient.setState({ termbuffers })
  return true
}

export function clearwanixtermbuffersstore(): void {
  useWanixClient.setState({
    termbuffers: new Map(),
    opensessions: new Set(),
  })
}

export function hasopensession(sessionkey: string): boolean {
  return useWanixClient.getState().opensessions.has(sessionkey)
}

export function addopensession(sessionkey: string): void {
  const opensessions = new Set(useWanixClient.getState().opensessions)
  opensessions.add(sessionkey)
  useWanixClient.setState({ opensessions })
}

export function deleteopensession(sessionkey: string): boolean {
  const opensessions = new Set(useWanixClient.getState().opensessions)
  if (!opensessions.delete(sessionkey)) {
    return false
  }
  useWanixClient.setState({ opensessions })
  return true
}

export function readwanixtermbufferkeys(): string[] {
  const { opensessions, termbuffers } = useWanixClient.getState()
  return [...new Set([...opensessions, ...termbuffers.keys()])]
}

export function readwanixtermnotifyversion(): number {
  return useWanixClient.getState().termnotifyversion
}

export function subscribewanixtermbuffer(listener: () => void) {
  let prev = useWanixClient.getState().termnotifyversion
  return useWanixClient.subscribe((state) => {
    if (state.termnotifyversion === prev) {
      return
    }
    prev = state.termnotifyversion
    listener()
  })
}

export function resetwanixtermbufferfortest(): void {
  useWanixClient.setState({
    termbuffers: new Map(),
    opensessions: new Set(),
    termnotifyversion: 0,
  })
}

// --- bridge ready / iframe window ---
// wanixisready is mirrored in zustand for React; Window/waiters stay on globalThis.

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
  return useWanixClient.getState().wanixisready
}

export function setwanixreadyflag(ready: boolean): void {
  readbridgestate().wanixisready = ready
  useWanixClient.setState({ wanixisready: ready })
}

export function resetwanixbridgefortest(): void {
  const state = readbridgestate()
  state.childwindow = null
  state.childwindowwaiters = []
  state.wanixisready = false
  state.readylisteners = []
  state.deliverwanixmessage = null
  useWanixClient.setState({ wanixisready: false })
}

// --- room pending (apply / spawn) (zustand) ---

export function readpendingapplyconfig(): WanixRoomConfig | null {
  return useWanixClient.getState().pendingapplyconfig
}

export function setpendingapplyconfig(next: WanixRoomConfig | null): void {
  useWanixClient.setState({ pendingapplyconfig: next })
}

export function readpendingspawn(): { taskid: string; cmd: string } | null {
  return useWanixClient.getState().pendingspawn
}

export function setpendingspawn(
  next: { taskid: string; cmd: string } | null,
): void {
  useWanixClient.setState({ pendingspawn: next })
}

export function resetwanixroompendingfortest(): void {
  useWanixClient.setState({
    pendingapplyconfig: null,
    pendingspawn: null,
  })
}

// --- zedcafe session flags (zustand) + pending sync/poll/waiters (module) ---

export function readlasthostpushdoc(): Record<string, unknown> {
  return useWanixClient.getState().lasthostpushdoc
}

export function setlasthostpushdoc(doc: Record<string, unknown>): void {
  useWanixClient.setState({ lasthostpushdoc: deepcopy(doc) })
}

export function clearlasthostpushdoc(): void {
  useWanixClient.setState({ lasthostpushdoc: {} })
}

export function readzedcafepollactive(): boolean {
  return useWanixClient.getState().pollactive
}

export function setzedcafepollactive(active: boolean): void {
  useWanixClient.setState({ pollactive: active })
}

export function readzedcafeguestdirty(): boolean {
  return useWanixClient.getState().guestdirty
}

export function setzedcafeguestdirty(dirty: boolean): void {
  useWanixClient.setState({ guestdirty: dirty })
}

export function readwanixzedcafependingexport(): boolean {
  return useWanixClient.getState().pendingexport
}

export function markwanixzedcafependingexport(): void {
  useWanixClient.setState({ pendingexport: true })
}

export function clearwanixzedcafependingexport(): void {
  useWanixClient.setState({ pendingexport: false })
}

let polltimer: ReturnType<typeof setInterval> | undefined
let polldevice: DEVICELIKE | null = null
let pollplayer = ''
let pendingexportwait: VmZedCafeExportWaiter | null = null
let pendingimportwait: VmZedCafeImportWaiter | null = null
let pendingsync: Pendingsync | null = null
let pendingpollphase: PendingPollPhase = null
/** True when a kick arrived while poll inactive or a phase was already in flight. */
let pendingpollkick = false

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

export function readpendingpollkick(): boolean {
  return pendingpollkick
}

export function setpendingpollkick(next: boolean): void {
  pendingpollkick = next
}

export function resetwanixzedcafesessionfortest(): void {
  useWanixClient.setState({
    lasthostpushdoc: {},
    pollactive: false,
    guestdirty: false,
  })
}

export function resetwanixzedcafependingfortest(): void {
  useWanixClient.setState({ pendingexport: false })
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
  pendingpollkick = false
}

/** Test hook — resets all wanixclient device state. */
export function resetwanixclientstatefortest(): void {
  resetwanixclientstore()
  onsessioncloseprune = null
  resetwanixbridgefortest()
  resetwanixzedcafependingfortest()
}
