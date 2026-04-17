/*
memorysync: VM-layer bridge between MEMORY and the jsonsync server device.

Owns the projections that carve MEMORY into what boardrunners actually need:
- one shared `memory` stream with top-level keys allowlisted, books Map
  converted to a record, and each book's board-type codepages peeled out of
  `pages` into their own streams
- one `board:${codepage.id}` stream per board codepage, with the embedded
  BOARD trimmed of runtime-only caches (draw fingerprints, distmaps, etc.)

Each boardrunner is admitted to the shared `memory` stream and only to the
board codepage streams it actually runs.

Push cadence is dirty-flag driven (see memory/memorydirty.ts). Memory writes
mark the relevant stream(s) dirty; the VM tick handler calls
`memorysyncpushdirty` after `memorytickmain` to drain the dirty set and call
`jsonsyncserverupdate` for each registered + dirty stream. Reverse-projection
of accepted client patches goes through `memorywithsilentwrites` to avoid
re-pushing the same change in a feedback loop.
*/
import {
  jsonsyncserveradmitplayer,
  jsonsyncserverreadstream,
  jsonsyncserverregister,
  jsonsyncserverupdate,
} from 'zss/device/jsonsyncserver'
import { deepcopy, isarray, ispresent, isstring } from 'zss/mapping/types'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import {
  MEMORY_STREAM_ID,
  memoryconsumealldirty,
  memorywithsilentwrites,
} from 'zss/memory/memorydirty'
import { memoryreadbookbyaddress, memoryreadroot } from 'zss/memory/session'
import { BOOK, BOOK_FLAGS, CODE_PAGE, CODE_PAGE_TYPE } from 'zss/memory/types'

import {
  BOARD_SYNC_TOPKEYS,
  MEMORY_SYNC_TOPKEYS,
  boardstreamid,
  projectboardcodepage,
  projectmemory,
} from './memoryproject'

export {
  BOARD_SYNC_TOPKEYS,
  MEMORY_STREAM_ID,
  MEMORY_SYNC_TOPKEYS,
  boardstreamid,
  projectboardcodepage,
  projectmemory,
}

export function memorysyncensureregistered(): void {
  const projected = projectmemory()
  if (!ispresent(jsonsyncserverreadstream(MEMORY_STREAM_ID))) {
    jsonsyncserverregister(MEMORY_STREAM_ID, projected, {
      topkeys: [...MEMORY_SYNC_TOPKEYS],
    })
    return
  }
  jsonsyncserverupdate(MEMORY_STREAM_ID, projected)
}

export function memorysyncensureboardregistered(codepage: CODE_PAGE): void {
  const streamid = boardstreamid(codepage)
  const projected = projectboardcodepage(codepage)
  if (!ispresent(jsonsyncserverreadstream(streamid))) {
    jsonsyncserverregister(streamid, projected)
    return
  }
  jsonsyncserverupdate(streamid, projected)
}

// admit a boardrunner player: refresh the memory stream, register-or-refresh
// the target board codepage stream, then admit the player to both.
export function memorysyncadmitboardrunner(
  player: string,
  boardaddress: string,
): void {
  if (!isstring(boardaddress) || !boardaddress) {
    return
  }
  const codepage = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.BOARD,
    boardaddress,
  )
  if (!ispresent(codepage)) {
    return
  }
  memorysyncensureregistered()
  memorysyncensureboardregistered(codepage)
  jsonsyncserveradmitplayer(MEMORY_STREAM_ID, player, true)
  jsonsyncserveradmitplayer(boardstreamid(codepage), player, true)
}

// VM tick hooks: callers decide when to push. The handler in vm/handlers/tick
// invokes `memorysyncpushdirty` after `memorytickmain` to drain the dirty set.
export function memorysyncupdatememory(): void {
  jsonsyncserverupdate(MEMORY_STREAM_ID, projectmemory())
}

export function memorysyncupdateboard(codepage: CODE_PAGE): void {
  jsonsyncserverupdate(boardstreamid(codepage), projectboardcodepage(codepage))
}

// stream id form is `board:<codepage.id>` — use codepage.id (which the runtime
// also writes onto board.id) to recover the codepage we need to project.
function codepagefromboardstreamid(streamid: string): CODE_PAGE | undefined {
  if (!streamid.startsWith('board:')) {
    return undefined
  }
  const id = streamid.slice('board:'.length)
  if (!id) {
    return undefined
  }
  return memorypickcodepagewithtypeandstat(CODE_PAGE_TYPE.BOARD, id)
}

// Iterate the dirty set: for each registered stream that is dirty, project
// its current shape and call `jsonsyncserverupdate` (which pokes peers via
// jsonsyncserver). Streams that are dirty but unregistered are silently
// dropped (no admitted clients to notify yet). Caller is responsible for
// gating on `memoryreadsimfreeze()`.
//
// Phase 2 of the boardrunner authoritative-tick plan: this also includes
// owned-board streams. Server-side loaders can still mutate any book or
// board (loader code can edit anything), and those mutations flip the same
// dirty bits. We push them upstream just like any other change; the elected
// runner reconciles via fuzzy apply against its local shadow.
export function memorysyncpushdirty(): void {
  const dirtyids = memoryconsumealldirty()
  for (let i = 0; i < dirtyids.length; ++i) {
    const streamid = dirtyids[i]
    if (!ispresent(jsonsyncserverreadstream(streamid))) {
      // not registered yet; nothing to push to
      continue
    }
    if (streamid === MEMORY_STREAM_ID) {
      jsonsyncserverupdate(streamid, projectmemory())
      continue
    }
    const codepage = codepagefromboardstreamid(streamid)
    if (ispresent(codepage)) {
      jsonsyncserverupdate(streamid, projectboardcodepage(codepage))
    }
  }
}

// merge a stream's just-accepted document back into MEMORY. Wrapped in
// `memorywithsilentwrites` so the writes do not re-mark this stream dirty,
// which would create a feedback loop where the server re-pushes the same
// change every tick. Runtime caches (named/lookup/distmaps/draw fingerprints)
// and overlay state (kinddata/category/display*) are NOT touched here; the
// next `memoryinitboard` (called by the tick) rebuilds them from `kind`.
export function memorysyncreverseproject(
  streamid: string,
  document: unknown,
): void {
  if (!ispresent(document) || typeof document !== 'object') {
    return
  }
  memorywithsilentwrites(() => {
    if (streamid === MEMORY_STREAM_ID) {
      reverseprojectmemory(document as Record<string, unknown>)
      return
    }
    if (streamid.startsWith('board:')) {
      reverseprojectboard(streamid, document as Record<string, unknown>)
    }
  })
}

const MEMORY_SCALAR_TOPKEYS: readonly string[] = [
  'session',
  'operator',
  'software',
  'halt',
  'simfreeze',
]

function reverseprojectmemory(document: Record<string, unknown>): void {
  const root = memoryreadroot() as unknown as Record<string, unknown>
  for (let i = 0; i < MEMORY_SCALAR_TOPKEYS.length; ++i) {
    const key = MEMORY_SCALAR_TOPKEYS[i]
    if (Object.prototype.hasOwnProperty.call(document, key)) {
      const value = document[key]
      if (key === 'software' && ispresent(value) && typeof value === 'object') {
        // shallow merge so we don't replace the live `software` object
        // reference observed elsewhere in MEMORY readers.
        Object.assign(
          root.software as Record<string, unknown>,
          value as Record<string, unknown>,
        )
      } else {
        root[key] = value as never
      }
    }
  }
  const incoming = document.books as Record<string, unknown> | undefined
  if (!ispresent(incoming) || typeof incoming !== 'object') {
    return
  }
  const bookids = Object.keys(incoming)
  for (let i = 0; i < bookids.length; ++i) {
    const bookid = bookids[i]
    const incomingbook = incoming[bookid] as Record<string, unknown>
    if (!ispresent(incomingbook)) {
      continue
    }
    const localbook = memoryreadbookbyaddress(bookid)
    if (!ispresent(localbook)) {
      // runtime book add/remove is a Phase 4 task; ignore unknown ids here.
      continue
    }
    mergebookscalars(localbook, incomingbook)
    mergebookflags(localbook, incomingbook)
    mergebooknonboardpages(localbook, incomingbook)
  }
}

const BOOK_SCALAR_KEYS: readonly string[] = ['name', 'activelist', 'token']

function mergebookscalars(book: BOOK, incoming: Record<string, unknown>): void {
  for (let i = 0; i < BOOK_SCALAR_KEYS.length; ++i) {
    const key = BOOK_SCALAR_KEYS[i]
    if (Object.prototype.hasOwnProperty.call(incoming, key)) {
      // book.timestamp is intentionally NOT in the projection; runners never
      // see it, so we never overwrite it here either.
      ;(book as unknown as Record<string, unknown>)[key] = incoming[key]
    }
  }
}

function mergebookflags(book: BOOK, incoming: Record<string, unknown>): void {
  if (!Object.prototype.hasOwnProperty.call(incoming, 'flags')) {
    return
  }
  const flags = incoming.flags
  if (!ispresent(flags) || typeof flags !== 'object') {
    return
  }
  // replace flags entirely so deletes round-trip.
  book.flags = deepcopy(flags) as Record<string, BOOK_FLAGS>
}

// non-BOARD pages are carried in the memory stream; BOARD pages live in their
// own board:<id> stream. Preserve the local BOARD pages, replace everything
// else from the incoming list (matched by id where possible to avoid losing
// the live runtime references on shared codepages).
function mergebooknonboardpages(
  book: BOOK,
  incoming: Record<string, unknown>,
): void {
  if (!Object.prototype.hasOwnProperty.call(incoming, 'pages')) {
    return
  }
  const pages = incoming.pages
  if (!isarray(pages)) {
    return
  }
  const nextpages: CODE_PAGE[] = []
  // keep all local BOARD pages
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]
    if (page.stats?.type === CODE_PAGE_TYPE.BOARD) {
      nextpages.push(page)
    }
  }
  // append non-BOARD pages from incoming, preferring the live local copy by
  // id when it exists (so any runtime caches on shared codepages survive).
  const localbyid = new Map<string, CODE_PAGE>()
  for (let i = 0; i < book.pages.length; ++i) {
    localbyid.set(book.pages[i].id, book.pages[i])
  }
  for (let i = 0; i < (pages as CODE_PAGE[]).length; ++i) {
    const incomingpage = (pages as CODE_PAGE[])[i]
    if (!ispresent(incomingpage) || typeof incomingpage !== 'object') {
      continue
    }
    if (incomingpage.stats?.type === CODE_PAGE_TYPE.BOARD) {
      // shouldn't appear (projection strips them) but defensively skip.
      continue
    }
    const local = localbyid.get(incomingpage.id)
    if (ispresent(local)) {
      // overwrite scalar fields on the live page reference
      Object.assign(local, incomingpage)
      nextpages.push(local)
    } else {
      nextpages.push(incomingpage)
    }
  }
  book.pages = nextpages
}

function reverseprojectboard(
  streamid: string,
  document: Record<string, unknown>,
): void {
  const codepage = codepagefromboardstreamid(streamid)
  if (!ispresent(codepage) || !ispresent(codepage.board)) {
    return
  }
  // overlay the BOARD_SYNC_TOPKEYS fields from the incoming document.board
  const incomingboard = document.board as Record<string, unknown> | undefined
  if (!ispresent(incomingboard) || typeof incomingboard !== 'object') {
    return
  }
  const target = codepage.board as unknown as Record<string, unknown>
  for (let i = 0; i < BOARD_SYNC_TOPKEYS.length; ++i) {
    const key = BOARD_SYNC_TOPKEYS[i]
    if (Object.prototype.hasOwnProperty.call(incomingboard, key)) {
      target[key] = incomingboard[key]
    }
  }
  // any non-board codepage scalars (e.g. `code`) come along too
  const codepageasrecord = codepage as unknown as Record<string, unknown>
  if (Object.prototype.hasOwnProperty.call(document, 'code')) {
    codepageasrecord.code = document.code
  }
}
