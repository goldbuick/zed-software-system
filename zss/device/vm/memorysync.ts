/*
memorysync: VM-layer bridge between MEMORY and the streamrepl server (sim).

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
`streamreplserverupdate` for each registered + dirty stream. Reverse-projection
of client push_batch merges goes through `memorywithsilentwrites` to avoid
re-pushing the same change in a feedback loop.
*/
import {
  streamreplserveradmitplayer,
  streamreplserverdropplayer,
  streamreplserverreadstream,
  streamreplserverregister,
  streamreplserverupdate,
} from 'zss/device/streamreplserver'
import { deepcopy, isarray, ispresent, isstring } from 'zss/mapping/types'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import {
  MEMORY_STREAM_ID,
  memoryconsumealldirty,
  memorymarkdirty,
  memorywithsilentwrites,
} from 'zss/memory/memorydirty'
import {
  memoryclearbook,
  memoryreadbookbyaddress,
  memoryreadbooklist,
  memoryreadroot,
  memorywritebook,
} from 'zss/memory/session'
import { BOOK, BOOK_FLAGS, CODE_PAGE, CODE_PAGE_TYPE } from 'zss/memory/types'

import {
  BOARD_SYNC_TOPKEYS,
  boardstreamid,
  projectboardcodepage,
  projectmemory,
} from './memoryproject'

export function memorysyncensureregistered(): void {
  const projected = projectmemory()
  if (!ispresent(streamreplserverreadstream(MEMORY_STREAM_ID))) {
    streamreplserverregister(MEMORY_STREAM_ID, projected)
    return
  }
  streamreplserverupdate(MEMORY_STREAM_ID, projected)
}

export function memorysyncensureboardregistered(codepage: CODE_PAGE): void {
  const streamid = boardstreamid(codepage)
  const projected = projectboardcodepage(codepage)
  if (!ispresent(streamreplserverreadstream(streamid))) {
    streamreplserverregister(streamid, projected)
    return
  }
  streamreplserverupdate(streamid, projected)
}

// admit a boardrunner player: refresh the memory stream, register-or-refresh
// the target board codepage stream, then admit the player to both. Also
// admits the runner to its cardinal + diagonal-reachable neighbor board
// streams so the runner's worker can hydrate neighbor codepages. Without
// multi-admission, `memoryreadgadgetlayers` cannot map cardinal exit
// addresses (e.g. `room2x1`) to neighbor codepage ids: every cardinal
// falls back to '' and every diagonal reconcile returns '' — misleading
// fog shows on every side even when the client already has cached layers.
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
  streamreplserveradmitplayer(MEMORY_STREAM_ID, player, true)
  streamreplserveradmitplayer(boardstreamid(codepage), player, true)
  admitneighborboardstreams(player, codepage)
}

// Admit the runner to its 4 cardinal neighbor streams and to each
// cardinal's 4 further neighbors. The second hop is what gives corner
// (diagonal) exit previews enough context to resolve codepage ids:
// corner resolution traverses two cardinals, so we must admit the
// boards two hops away as well.
function admitneighborboardstreams(
  player: string,
  centercodepage: CODE_PAGE,
): void {
  const seen = new Set<string>([centercodepage.id])
  const cardinalcps = collectcardinalneighbors(centercodepage, seen)
  for (let i = 0; i < cardinalcps.length; ++i) {
    admitboardstream(player, cardinalcps[i])
  }
  for (let i = 0; i < cardinalcps.length; ++i) {
    const outer = collectcardinalneighbors(cardinalcps[i], seen)
    for (let j = 0; j < outer.length; ++j) {
      admitboardstream(player, outer[j])
    }
  }
}

function collectcardinalneighbors(
  codepage: CODE_PAGE,
  seen: Set<string>,
): CODE_PAGE[] {
  const board = codepage.board
  if (!ispresent(board)) {
    return []
  }
  const addrs = [
    board.exitnorth,
    board.exitsouth,
    board.exiteast,
    board.exitwest,
  ]
  const out: CODE_PAGE[] = []
  for (let i = 0; i < addrs.length; ++i) {
    const addr = addrs[i]
    if (!isstring(addr) || !addr) {
      continue
    }
    const cp = memorypickcodepagewithtypeandstat(CODE_PAGE_TYPE.BOARD, addr)
    if (!ispresent(cp) || seen.has(cp.id)) {
      continue
    }
    seen.add(cp.id)
    out.push(cp)
  }
  return out
}

function admitboardstream(player: string, codepage: CODE_PAGE): void {
  memorysyncensureboardregistered(codepage)
  streamreplserveradmitplayer(boardstreamid(codepage), player, true)
}

// Inverse of memorysyncadmitboardrunner: drop the player from the target
// board stream and all of its cardinal + two-hop neighbor streams. Used when
// an election flips to a different player so the previous owner stops
// receiving pokes / snapshots and loses write admission. The shared
// MEMORY_STREAM_ID is not dropped here — players stay admitted to memory as
// long as they are logged in (see handlelogout for memory-stream removal).
export function memorysyncrevokeboardrunner(
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
  streamreplserverdropplayer(boardstreamid(codepage), player)
  revokeneighborboardstreams(player, codepage)
}

function revokeneighborboardstreams(
  player: string,
  centercodepage: CODE_PAGE,
): void {
  const seen = new Set<string>([centercodepage.id])
  const cardinalcps = collectcardinalneighbors(centercodepage, seen)
  for (let i = 0; i < cardinalcps.length; ++i) {
    streamreplserverdropplayer(boardstreamid(cardinalcps[i]), player)
  }
  for (let i = 0; i < cardinalcps.length; ++i) {
    const outer = collectcardinalneighbors(cardinalcps[i], seen)
    for (let j = 0; j < outer.length; ++j) {
      streamreplserverdropplayer(boardstreamid(outer[j]), player)
    }
  }
}

// Full logout cleanup: drop the player from every stream, including the
// shared memory stream. Called from handlelogout after memorylogoutplayer
// has cleared the player's flags.
export function memorysyncdropplayerfromall(player: string): void {
  streamreplserverdropplayer(MEMORY_STREAM_ID, player)
}

// VM tick hooks: callers decide when to push. The handler in vm/handlers/tick
// invokes `memorysyncpushdirty` after `memorytickmain` to drain the dirty set.
export function memorysyncupdatememory(): void {
  streamreplserverupdate(MEMORY_STREAM_ID, projectmemory())
}

export function memorysyncupdateboard(codepage: CODE_PAGE): void {
  streamreplserverupdate(
    boardstreamid(codepage),
    projectboardcodepage(codepage),
  )
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
// its current shape and call `streamreplserverupdate` (which fans out
// stream_row to admitted peers). Streams that are dirty but unregistered are silently
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
    if (!ispresent(streamreplserverreadstream(streamid))) {
      // Stream not registered yet — re-queue so a later register + tick
      // still pushes this edit.
      memorymarkdirty(streamid)
      continue
    }
    if (streamid === MEMORY_STREAM_ID) {
      streamreplserverupdate(streamid, projectmemory())
      continue
    }
    const codepage = codepagefromboardstreamid(streamid)
    if (ispresent(codepage)) {
      streamreplserverupdate(streamid, projectboardcodepage(codepage))
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
  const incomingids = Object.keys(incoming)
  const seen = new Set<string>()
  for (let i = 0; i < incomingids.length; ++i) {
    const bookid = incomingids[i]
    const incomingbook = incoming[bookid] as Record<string, unknown>
    if (!ispresent(incomingbook)) {
      continue
    }
    seen.add(bookid)
    const localbook = memoryreadbookbyaddress(bookid)
    if (!ispresent(localbook)) {
      // Phase 4 book add: materialize a new BOOK from the incoming record.
      // Books in the memory stream projection omit BOARD-type codepages
      // (they travel via their own `board:<id>` streams); the created book
      // starts with the non-BOARD pages it carries. BOARD pages arrive on
      // their admission cycle and are attached by memoryhydrate.
      const created = createbookfromincoming(bookid, incomingbook)
      if (ispresent(created)) {
        memorywritebook(created)
      }
      continue
    }
    mergebookscalars(localbook, incomingbook)
    mergebookflags(localbook, incomingbook)
    mergebooknonboardpages(localbook, incomingbook)
  }
  // Phase 4 book remove: any local book id not mentioned by the incoming
  // document dropped out of the authoritative projection and must be
  // deleted locally. We only act on the SERVER side of reverse-projection
  // (where the stream document IS the authority). The memory stream's
  // projection always includes every MEMORY.books entry, so absence is a
  // real delete signal and not a partial view.
  const locals = memoryreadbooklist()
  for (let i = 0; i < locals.length; ++i) {
    const local = locals[i]
    if (!seen.has(local.id)) {
      memoryclearbook(local.id)
    }
  }
}

function createbookfromincoming(
  bookid: string,
  incomingbook: Record<string, unknown>,
): BOOK | undefined {
  const name = isstring(incomingbook.name) ? incomingbook.name : ''
  const book: BOOK = {
    id: bookid,
    name,
    timestamp: 0,
    activelist: isarray(incomingbook.activelist)
      ? (deepcopy(incomingbook.activelist) as string[])
      : [],
    pages: isarray(incomingbook.pages)
      ? (deepcopy(incomingbook.pages) as CODE_PAGE[])
      : [],
    flags:
      ispresent(incomingbook.flags) && typeof incomingbook.flags === 'object'
        ? (deepcopy(incomingbook.flags) as Record<string, BOOK_FLAGS>)
        : {},
  }
  if (isstring(incomingbook.token)) {
    ;(book as unknown as Record<string, unknown>).token = incomingbook.token
  }
  return book
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
