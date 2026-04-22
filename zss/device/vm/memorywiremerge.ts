/*
Shared wire merge helpers for `memory` stream books/flags: used by worker
hydration (`memoryhydrateimpl`) and sim reverse-projection (`memoryproject`).
*/
import { ispid } from 'zss/mapping/guid'
import { deepcopy, isarray, ispresent } from 'zss/mapping/types'
import { memoryreadcodepagestats } from 'zss/memory/codepageoperations'
import {
  BOOK,
  BOOK_FLAGS,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from 'zss/memory/types'

/** Top-level book fields merged from the wire `books[id]` record (hydrate + unproject). */
export const BOOK_WIRE_SCALAR_KEYS = [
  'name',
  'activelist',
  'token',
] as const satisfies readonly (keyof BOOK)[]

// merge an incoming flags projection into the worker's local flags in place.
//
// Also used by sim-side `memoryproject` unproject merges: partial client pushes
// must merge into canonical MEMORY instead of replacing whole `book.flags`,
// or `flags[pid_*]` rows can disappear while the player is still on
// `activelist`. Gadget UI state replicates via `gadget:<pid>` streams, not
// the `memory` projection.
//
// IMPORTANT: this function mutates `existing` in place and keeps the same
// object reference for every `existing[id]` that also appears in `incoming`.
// chips (and other long-lived consumers) close over `mainbook.flags[chipid]`
// at boot via memoryreadflags(mem); if we returned a fresh object each
// hydrate, those closures would go stale on every memory sync and the chip
// would silently write to an orphaned object.
export function mergeflagspreservingvolatile(
  existing: Record<string, BOOK_FLAGS>,
  incoming: Record<string, Record<string, unknown>>,
  activelist: readonly string[],
): Record<string, BOOK_FLAGS> {
  const seen = new Set<string>()
  const active = new Set(activelist)
  const incomingids = Object.keys(incoming)
  for (let i = 0; i < incomingids.length; ++i) {
    const id = incomingids[i]
    const incomingentry = incoming[id]
    if (!ispresent(incomingentry) || typeof incomingentry !== 'object') {
      continue
    }
    seen.add(id)
    const existingentry = existing[id] as Record<string, unknown> | undefined
    if (!ispresent(existingentry) || typeof existingentry !== 'object') {
      // new id — deep copy in
      existing[id] = deepcopy(incomingentry) as BOOK_FLAGS
      continue
    }

    // drop any existing keys not in incoming
    const existingkeys = Object.keys(existingentry)
    for (let k = 0; k < existingkeys.length; ++k) {
      const key = existingkeys[k]
      if (!Object.prototype.hasOwnProperty.call(incomingentry, key)) {
        // Canonical sim always carries `board` for on-board players, but a
        // merged snapshot can omit the key (ordering, projection gaps, or
        // JSON drops). Deleting it here left boardrunner workers with an empty
        // `memoryreadbookflag(..., 'board')` while `boardrunner:ownedboard` was
        // already set — no worker-side fallback should be required.
        if (key === 'board') {
          continue
        }
        if (ispid(key) && active.has(key)) {
          continue
        }
        delete existingentry[key]
      }
    }
    // apply incoming (deep-copied values)
    const incomingkeys = Object.keys(incomingentry)
    for (let k = 0; k < incomingkeys.length; ++k) {
      const key = incomingkeys[k]
      const next = deepcopy(incomingentry[key])
      existingentry[key] = next as BOOK_FLAGS[string]
    }
  }
  // remove entries not present in incoming — this is how endgame/halt reaches
  // the worker: the sim deletes flags[chipid] (or flags[pid]) and the missing
  // entry propagates here.
  const existingids = Object.keys(existing)
  for (let i = 0; i < existingids.length; ++i) {
    const id = existingids[i]
    if (!seen.has(id)) {
      // A full `projectmemory()` includes every flags row, but some fan-outs
      // can omit player ids (payload size, ordering). Dropping `flags[pid]`
      // for a player still on `activelist` clears their `board` flag on the
      // boardrunner worker and stalls gadget layers / synth for that client.
      if (ispid(id) && active.has(id)) {
        continue
      }
      if (id === (MEMORY_LABEL.GADGETSTORE as string)) {
        continue
      }
      delete existing[id]
    }
  }
  return existing
}

/** `books[].pages` from the `memory` stream: full ordered list; BOARD rows are shells only. */
export function mergebookpagesfrommemoryprojection(
  book: BOOK,
  incomingpages: unknown,
): void {
  if (!isarray(incomingpages)) {
    return
  }
  const localbyid = new Map<string, CODE_PAGE>()
  for (let i = 0; i < book.pages.length; ++i) {
    localbyid.set(book.pages[i].id, book.pages[i])
  }
  const pages = incomingpages as CODE_PAGE[]
  const nextpages: CODE_PAGE[] = []
  for (let i = 0; i < pages.length; ++i) {
    const incomingpage = pages[i]
    if (!ispresent(incomingpage) || typeof incomingpage !== 'object') {
      continue
    }
    if (incomingpage.stats?.type === CODE_PAGE_TYPE.BOARD) {
      const local = localbyid.get(incomingpage.id)
      const incCode =
        typeof incomingpage.code === 'string' ? incomingpage.code : ''
      if (ispresent(local)) {
        if (local.code !== incCode) {
          local.code = incCode
          local.stats = undefined
        }
        local.id = incomingpage.id
        const stats = memoryreadcodepagestats(local)
        if (stats.type !== CODE_PAGE_TYPE.BOARD) {
          stats.type = CODE_PAGE_TYPE.BOARD
        }
        nextpages.push(local)
      } else {
        const shell: CODE_PAGE = {
          id: incomingpage.id,
          code: incCode,
          board: undefined,
          stats: undefined,
        }
        const st = memoryreadcodepagestats(shell)
        if (st.type !== CODE_PAGE_TYPE.BOARD) {
          st.type = CODE_PAGE_TYPE.BOARD
        }
        nextpages.push(shell)
      }
      continue
    }
    const local = localbyid.get(incomingpage.id)
    if (ispresent(local)) {
      Object.assign(local, deepcopy(incomingpage))
      nextpages.push(local)
    } else {
      nextpages.push(deepcopy(incomingpage))
    }
  }
  book.pages = nextpages
}
