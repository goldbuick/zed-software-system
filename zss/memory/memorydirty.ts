/*
memorydirty: per-stream dirty-flag bookkeeping for the jsonsync push loop.

Lives in the memory layer (sibling of session.ts) so memory write helpers can
mark streams dirty without depending on the device/vm layer (which would
introduce a cycle). The VM-level memorysync module consumes the dirty set
from here.

Two moving parts:
- `memorystream()` / `boardstream(boardid)` give callers the canonical
  stream ids without needing to import the device layer.
- `memorymarkdirty` / `memoryconsumedirty` / `memoryconsumealldirty` track
  which streams have meaningful pending changes since the last push.

Reverse-projection (server applying an accepted clientpatch back into MEMORY)
must not falsely re-mark the just-applied stream as dirty — that would create
a feedback loop where the server immediately re-pushes the same change.  
*/
import { MAYBE, ispresent } from 'zss/mapping/types'

import type { BOARD } from './types'

export function memorystream(): string {
  return `memory`
}

/** Canonical id for the shared memory jsonsync stream (`memorystream()`). */
export const MEMORY_STREAM_ID = 'memory'

export function ismemorystream(stream: string): boolean {
  return stream === `memory`
}

export function boardstream(boardid: string): string {
  return `board:${boardid}`
}

export function isboardstream(stream: string): boolean {
  return stream.startsWith('board:')
}

/** Per-player gadget UI document (`GADGET_STATE`) replicated outside the `memory` stream. */
export function gadgetstream(player: string): string {
  return `gadget:${player}`
}

export function isgadgetstream(stream: string): boolean {
  return stream.startsWith('gadget:')
}

/** Per-player book.flags[pid] bag (non-volatile keys) replicated outside the `memory` stream. */
export function flagsstream(player: string): string {
  return `flags:${player}`
}

export function isflagsstream(stream: string): boolean {
  return stream.startsWith('flags:')
}

/** Recover `codepage.id` from a `board:<codepage.id>` stream id (not `boardstream()`, which adds the prefix). */
export function boardidfromboardstream(stream: string): string {
  if (!isboardstream(stream)) {
    return ''
  }
  return stream.slice('board:'.length)
}

/** Recover player id from a `gadget:<player>` stream id. */
export function playeridfromgadgetstream(stream: string): string {
  if (!isgadgetstream(stream)) {
    return ''
  }
  return stream.slice('gadget:'.length)
}

/** Recover player id from a `flags:<player>` stream id. */
export function playeridfromflagsstream(stream: string): string {
  if (!isflagsstream(stream)) {
    return ''
  }
  return stream.slice('flags:'.length)
}

export function boardstreamfromboarddata(board: MAYBE<BOARD>): string {
  if (!ispresent(board) || !board.id) {
    return ''
  }
  return boardstream(board.id)
}

let silentdepth = 0
const dirty = new Set<string>()

export function memorymarkdirty(stream: string): void {
  if (silentdepth > 0 || !stream) {
    return
  }
  dirty.add(stream)
}

export function memorymarkmemorydirty(): void {
  memorymarkdirty(memorystream())
}

export function memorymarkboarddirty(board: MAYBE<BOARD>): void {
  const stream = boardstreamfromboarddata(board)
  if (stream) {
    memorymarkdirty(stream)
  }
}

export function memoryconsumedirty(stream: string): boolean {
  if (dirty.has(stream)) {
    dirty.delete(stream)
    return true
  }
  return false
}

export function memoryconsumealldirty(): string[] {
  if (dirty.size === 0) {
    return []
  }
  const ids = [...dirty]
  dirty.clear()
  return ids
}

export function memoryhasdirty(stream: string): boolean {
  return dirty.has(stream)
}

export function memorydirtyclear(): void {
  dirty.clear()
}

export function memorywithsilentwrites<T>(fn: () => T): T {
  silentdepth += 1
  try {
    return fn()
  } finally {
    silentdepth -= 1
  }
}

export function memoryissilentwriting(): boolean {
  return silentdepth > 0
}
