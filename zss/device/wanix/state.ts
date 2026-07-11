/**
 * Shared mutable state for the wanix iframe realm.
 * Used by device/wanix/runtime and device/wanix handlers.
 */

import type { WanixSystemElement } from 'zss/feature/wanix/wanixelements.d.ts'
import type {
  WanixBindDropPayload,
  WanixRoomConfig,
} from 'zss/feature/wanix/wanixroomtypes'
import type { WANIX_TERM_GRID } from 'zss/feature/wanix/wanixtermgridstate'

export type WanixSessionKind = 'vm' | 'task'
export type WanixSessionEvent = 'open' | 'active' | 'close'

export type WanixSystemWithTerminals = WanixSystemElement & {
  _updateTerminals: (shim: {
    path: string
    _term: { cols: number; rows: number }
  }) => void
}

export type TermSession = {
  alive: boolean
  kind: WanixSessionKind
  termpath: string
  lastcols: number
  lastrows: number
  lastcelldigest: string
  idletimer: ReturnType<typeof setTimeout> | null
  grid: WANIX_TERM_GRID
  reader: ReadableStreamDefaultReader<Uint8Array> | null
  writer: WritableStreamDefaultWriter<Uint8Array> | null
  write: (text: string) => Promise<void>
  disconnect: () => void
}

export const DEFAULT_TERM_COLS = 80
export const DEFAULT_TERM_ROWS = 24

export const termsessions = new Map<string, TermSession>()
export const sessionconnectorder: string[] = []
export const termlinebufs = new Map<string, string>()
export const vmpendingdropbinds: WanixBindDropPayload[] = []

export let activesessionkey: string | null = null
export let roomconfig: WanixRoomConfig = {
  mode: 'idle',
  mountkey: 0,
  archives: [],
  remotes: [],
  tasks: [],
}
export let lastmountkey = -1
export let system: WanixSystemElement | null = null
export let lastfitcols = DEFAULT_TERM_COLS
export let lastfitrows = DEFAULT_TERM_ROWS

export function setactivesessionkey(next: string | null): void {
  activesessionkey = next
}

export function setroomconfig(next: WanixRoomConfig): void {
  roomconfig = next
}

export function setlastmountkey(next: number): void {
  lastmountkey = next
}

export function setwanixsystem(next: WanixSystemElement | null): void {
  system = next
}

export function readwanixsystem(): WanixSystemElement | null {
  return system
}

export function readroomconfig(): WanixRoomConfig {
  return roomconfig
}

export function readactivesessionkey(): string | null {
  return activesessionkey
}

export function readlastmountkey(): number {
  return lastmountkey
}

export function readlastfitcols(): number {
  return lastfitcols
}

export function readlastfitrows(): number {
  return lastfitrows
}

export function recordtermfit(cols: number, rows: number): void {
  lastfitcols = Math.max(1, Number(cols) || 1)
  lastfitrows = Math.max(1, Number(rows) || 1)
}

export function readsessionsessionkind(sessionkey: string): WanixSessionKind {
  if (roomconfig.vm?.active && sessionkey === roomconfig.vm.id) {
    return 'vm'
  }
  return 'task'
}

export function recordtermsessionconnect(sessionkey: string): void {
  const index = sessionconnectorder.indexOf(sessionkey)
  if (index >= 0) {
    sessionconnectorder.splice(index, 1)
  }
  sessionconnectorder.push(sessionkey)
}

export function forgettermsessionconnect(sessionkey: string): void {
  const index = sessionconnectorder.indexOf(sessionkey)
  if (index >= 0) {
    sessionconnectorder.splice(index, 1)
  }
}

export function clearsessionconnectorder(): void {
  sessionconnectorder.length = 0
}

export function pruneworkerroomtask(taskid: string): void {
  if (readsessionsessionkind(taskid) !== 'task') {
    return
  }
  roomconfig.tasks = roomconfig.tasks.filter((entry) => entry.id !== taskid)
}

export function readtermsession(sessionkey?: string | null): TermSession {
  if (sessionkey != null && sessionkey !== '') {
    const session = termsessions.get(String(sessionkey))
    if (!session) {
      throw new Error(`wanix term session missing: ${sessionkey}`)
    }
    return session
  }
  const first = termsessions.values().next().value
  if (!first) {
    throw new Error('wanix term session missing')
  }
  return first
}

export function settermsession(sessionkey: string, session: TermSession): void {
  termsessions.set(sessionkey, session)
}

export function deletetermsession(sessionkey: string): void {
  termsessions.delete(sessionkey)
}

export function hastermsession(sessionkey: string): boolean {
  return termsessions.has(sessionkey)
}

export function readtermlinebuf(sessionkey: string): string {
  return termlinebufs.get(sessionkey) ?? ''
}

export function settermlinebuf(sessionkey: string, buf: string): void {
  termlinebufs.set(sessionkey, buf)
}

export function deletetermlinebuf(sessionkey: string): void {
  termlinebufs.delete(sessionkey)
}

export function clearvmpendingdropbinds(): void {
  vmpendingdropbinds.length = 0
}

export function queuevmpendingdropbind(spec: WanixBindDropPayload): void {
  const index = vmpendingdropbinds.findIndex((entry) => entry.dst === spec.dst)
  if (index >= 0) {
    vmpendingdropbinds.splice(index, 1, spec)
    return
  }
  vmpendingdropbinds.push(spec)
}

export function takependingdropbinds(): WanixBindDropPayload[] {
  if (!vmpendingdropbinds.length) {
    return []
  }
  const pending = [...vmpendingdropbinds]
  vmpendingdropbinds.length = 0
  return pending
}

/** Live connect-order keys that still have a term session. */
export function readliveconnectorder(): string[] {
  return sessionconnectorder.filter((key) => termsessions.has(key))
}
