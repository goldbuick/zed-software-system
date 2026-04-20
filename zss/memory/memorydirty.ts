/*
memorydirty: per-stream dirty-flag bookkeeping for the jsonsync push loop.

Lives in the memory layer (sibling of session.ts) so memory write helpers can
mark streams dirty without depending on the device/vm layer (which would
introduce a cycle). The VM-level memorysync module consumes the dirty set
from here.

Two moving parts:
- `MEMORY_STREAM_ID` / `boardstreamid(boardid)` give callers the canonical
  stream ids without needing to import the device layer.
- `memorymarkdirty` / `memoryconsumedirty` / `memoryconsumealldirty` track
  which streams have meaningful pending changes since the last push.

Reverse-projection (server applying an accepted clientpatch back into MEMORY)
must not falsely re-mark the just-applied stream as dirty — that would create
a feedback loop where the server immediately re-pushes the same change. The
`memorywithsilentwrites` guard short-circuits `memorymarkdirty` while a
reverse-projection (or any other "this MEMORY mutation is already in-flight
elsewhere") is in progress.
*/
import { MAYBE, ispresent } from 'zss/mapping/types'

import type { BOARD } from './types'

export const MEMORY_STREAM_ID = 'memory'

export function boardstreamid(boardid: string): string {
  return `board:${boardid}`
}

/** Per-player gadget UI document (`GADGET_STATE`) replicated outside the `memory` stream. */
export function gadgetstreamid(player: string): string {
  return `gadget:${player}`
}

/** Per-player book.flags[pid] bag (non-volatile keys) replicated outside the `memory` stream. */
export function flagsstreamid(player: string): string {
  return `flags:${player}`
}

export function boardstreamidfromboard(board: MAYBE<BOARD>): string {
  if (!ispresent(board) || !board.id) {
    return ''
  }
  return boardstreamid(board.id)
}

const dirty = new Set<string>()

let silentdepth = 0

export function memorymarkdirty(streamid: string): void {
  if (silentdepth > 0 || !streamid) {
    return
  }
  dirty.add(streamid)
}

export function memorymarkmemorydirty(): void {
  memorymarkdirty(MEMORY_STREAM_ID)
}

export function memorymarkboarddirty(board: MAYBE<BOARD>): void {
  const streamid = boardstreamidfromboard(board)
  if (streamid) {
    memorymarkdirty(streamid)
  }
}

export function memoryconsumedirty(streamid: string): boolean {
  if (dirty.has(streamid)) {
    dirty.delete(streamid)
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

export function memorydirtyhas(streamid: string): boolean {
  return dirty.has(streamid)
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
