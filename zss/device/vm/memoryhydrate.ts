/*
memoryhydrate: worker-side bridge between jsonsync streams and the local
MEMORY singleton.

Counterpart to `memorysync.ts`. memorysync runs on the SERVER (simspace) and
projects MEMORY -> jsonsync streams + reverse-projects accepted client patches
back into MEMORY. memoryhydrate runs on a CLIENT process (boardrunner worker)
and applies inbound jsonsync snapshots & patches into that worker's local
MEMORY singleton, creating books/pages on the fly.

Differences vs server-side reverseproject:
- The worker may receive a snapshot for a book it has never seen before;
  hydrate must create it (memorywritebook) instead of skipping.
- The `memory` stream lists every codepage; BOARD rows are **shells** (id,
  code, stats.type). A `board:<id>` snapshot carries the playable BOARD body;
  it can arrive before or after the shell and uses `hydrateboard` to attach
  terrain/objects and run `memoryinitboard` for runtime caches.
- All writes are wrapped in `memorywithsilentwrites` so server-driven
  hydration never re-marks the just-applied stream dirty (which would loop
  the change right back upstream).

Worker DOES still mark dirty when its own local tick mutates state — those
writes happen outside hydration and feed `memorysyncpushdirty` on the worker
side (see phase2-worker-emit-patches).
*/
import { ispid } from 'zss/mapping/guid'
import { deepcopy, isarray, ispresent } from 'zss/mapping/types'
import { memoryinitboard } from 'zss/memory/boards'
import { memoryreadbookflags } from 'zss/memory/bookoperations'
import { memoryreadcodepagestats } from 'zss/memory/codepageoperations'
import { memorydebugassertactivelistboardinvariantifenabled } from 'zss/memory/debugactivelistinvariant'
import {
  boardfromboardstream,
  isboardstream,
  isflagsstream,
  isgadgetstream,
  ismemorystream,
  memorywithsilentwrites,
  playerfromflagsstream,
  playerfromgadgetstream,
} from 'zss/memory/memorydirty'
import {
  memoryclearbook,
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memoryreadroot,
  memorywritebook,
  memorywritefreeze,
  memorywritehalt,
  memorywriteoperator,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import {
  BOARD,
  BOOK,
  BOOK_FLAGS,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from 'zss/memory/types'

export function memoryhydratefromjsonsync(
  stream: string,
  document: unknown,
  log = false,
): void {
  if (!ispresent(document) || typeof document !== 'object') {
    return
  }
  memorywithsilentwrites(() => {
    if (ismemorystream(stream)) {
      if (log) {
        console.info('hydrating memory', document)
      }
      hydratememory(document as Record<string, unknown>)
      return
    }
    if (isboardstream(stream)) {
      const boardid = boardfromboardstream(stream)
      if (boardid) {
        if (log) {
          console.info('hydrating board', boardid, document)
        }
        hydrateboard(boardid, document as Record<string, unknown>)
      }
      return
    }
    if (isgadgetstream(stream)) {
      const player = playerfromgadgetstream(stream)
      if (player) {
        if (log) {
          console.info('hydrating gadget', player, document)
        }
        hydrategadget(player, document as Record<string, unknown>)
      }
      return
    }
    if (isflagsstream(stream)) {
      const player = playerfromflagsstream(stream)
      if (player) {
        if (log) {
          console.info('hydrating flags', player, document)
        }
        hydrateplayerflags(player, document as Record<string, unknown>)
      }
    }
  })
}

function hydrategadget(
  player: string,
  document: Record<string, unknown>,
): void {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const gadgetstore = memoryreadbookflags(
    mainbook,
    MEMORY_LABEL.GADGETSTORE,
  ) as Record<string, unknown>
  gadgetstore[player] = deepcopy(document)
}

function hydrateplayerflags(
  player: string,
  document: Record<string, unknown>,
): void {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  mergeflagspreservingvolatile(
    mainbook.flags,
    { [player]: document },
    mainbook.activelist ?? [],
  )
}

function hydratememory(document: Record<string, unknown>): void {
  // scalar top-level keys (operator, halt, freeze). session is read-only
  // identity from the server and is not surfaced via a writer; software is
  // applied below after we ensure the referenced books exist.
  if (
    Object.prototype.hasOwnProperty.call(document, 'operator') &&
    typeof document.operator === 'string'
  ) {
    memorywriteoperator(document.operator)
  }
  if (Object.prototype.hasOwnProperty.call(document, 'halt')) {
    memorywritehalt(Boolean(document.halt))
  }
  if (Object.prototype.hasOwnProperty.call(document, 'freeze')) {
    memorywritefreeze(Boolean(document.freeze))
  }
  // hydrate other top-level keys
  hydratebooks(document)
  hydratesoftware(document)
  memorydebugassertactivelistboardinvariantifenabled(
    memoryreadbookbysoftware(MEMORY_LABEL.MAIN),
  )
}

function hydratebooks(document: Record<string, unknown>): void {
  const incoming = document.books as Record<string, unknown> | undefined
  if (!ispresent(incoming) || typeof incoming !== 'object') {
    return
  }
  const ids = Object.keys(incoming)
  const seen = new Set<string>()
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]
    const incomingbook = incoming[id] as Record<string, unknown>
    if (!ispresent(incomingbook) || typeof incomingbook !== 'object') {
      continue
    }
    seen.add(id)
    const existing = memoryreadbookbyaddress(id)
    if (ispresent(existing)) {
      mergebookinto(existing, incomingbook)
    } else {
      memorywritebook(buildbookfromincoming(id, incomingbook))
    }
  }
  // Phase 4 book remove: if a local book id is not mentioned by the
  // authoritative memory stream, delete it from the worker's MEMORY so
  // the two views converge. Server-driven deletes propagate here via
  // hydration; worker never originates book-level creates/removes.
  const locals = memoryreadbooklist()
  for (let i = 0; i < locals.length; ++i) {
    const local = locals[i]
    if (!seen.has(local.id)) {
      memoryclearbook(local.id)
    }
  }
}

function hydratesoftware(document: Record<string, unknown>): void {
  const software = document.software as Record<string, unknown> | undefined
  if (!ispresent(software) || typeof software !== 'object') {
    return
  }
  const root = memoryreadroot()
  const slots = Object.keys(software)
  for (let i = 0; i < slots.length; ++i) {
    const slot = slots[i]
    const value = software[slot]
    if (typeof value !== 'string') {
      continue
    }
    if (slot in root.software) {
      // memorywritesoftwarebook is a no-op if the book id is unknown; we
      // already hydrated books above, so the intended target should resolve.
      memorywritesoftwarebook(slot as keyof typeof root.software, value)
    }
  }
}

const BOOK_SCALAR_KEYS: readonly (keyof BOOK)[] = [
  'name',
  'activelist',
  'token',
]

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

function mergebookinto(book: BOOK, incoming: Record<string, unknown>): void {
  for (let i = 0; i < BOOK_SCALAR_KEYS.length; ++i) {
    const key = BOOK_SCALAR_KEYS[i]
    if (Object.prototype.hasOwnProperty.call(incoming, key)) {
      const bookrec = book as unknown as Record<string, unknown>
      bookrec[key as string] = deepcopy(incoming[key as string])
    }
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'flags')) {
    const flags = incoming.flags
    if (ispresent(flags) && typeof flags === 'object') {
      book.flags = mergeflagspreservingvolatile(
        book.flags,
        flags as Record<string, Record<string, unknown>>,
        book.activelist ?? [],
      )
    }
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'pages')) {
    mergebookpagesfrommemoryprojection(book, incoming.pages)
  }
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

function buildbookfromincoming(
  id: string,
  incoming: Record<string, unknown>,
): BOOK {
  const flags = incoming.flags
  const pages = incoming.pages
  const book: BOOK = {
    id,
    name: typeof incoming.name === 'string' ? incoming.name : id,
    timestamp: 0,
    activelist: isarray(incoming.activelist)
      ? (deepcopy(incoming.activelist) as string[])
      : [],
    pages: [],
    flags:
      ispresent(flags) && typeof flags === 'object'
        ? (deepcopy(flags) as Record<string, BOOK_FLAGS>)
        : {},
  }
  if (typeof incoming.token === 'string') {
    book.token = incoming.token
  }
  if (isarray(pages)) {
    const list = pages as CODE_PAGE[]
    for (let i = 0; i < list.length; ++i) {
      const incomingpage = list[i]
      if (!ispresent(incomingpage) || typeof incomingpage !== 'object') {
        continue
      }
      if (incomingpage.stats?.type === CODE_PAGE_TYPE.BOARD) {
        const shell: CODE_PAGE = {
          id: incomingpage.id,
          code: typeof incomingpage.code === 'string' ? incomingpage.code : '',
          board: undefined,
          stats: undefined,
        }
        const st = memoryreadcodepagestats(shell)
        if (st.type !== CODE_PAGE_TYPE.BOARD) {
          st.type = CODE_PAGE_TYPE.BOARD
        }
        book.pages.push(shell)
        continue
      }
      book.pages.push(deepcopy(incomingpage))
    }
  }
  return book
}

// place the incoming board codepage in the main book, creating the page if
// missing. We use the main book because boardrunners only run boards owned by
// `software.main` (per memoryreadboardrunnerchoices).
function hydrateboard(
  boardid: string,
  document: Record<string, unknown>,
): void {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    // no main book yet — memory snapshot hasn't arrived. drop on the floor;
    // a follow-up board patch (or the next snapshot) will retry.
    return
  }
  let codepage = mainbook.pages.find((p) => p.id === boardid)
  if (!ispresent(codepage)) {
    codepage = {
      id: boardid,
      code: typeof document.code === 'string' ? document.code : '',
      board: undefined,
      stats: undefined,
    }
    mainbook.pages.push(codepage)
  }
  if (Object.prototype.hasOwnProperty.call(document, 'code')) {
    if (typeof document.code === 'string' && codepage.code !== document.code) {
      codepage.code = document.code
      // code changed; discard cached stats so memoryreadcodepagestats re-parses
      // the @board <name> directive and other @stat lines. Without this, stats
      // would keep their previous (possibly empty) name and name-based lookups
      // like `memorylistcodepagebytypeandstat(..., 'room1x0')` would never
      // match this codepage.
      codepage.stats = undefined
    }
  }
  // Parse stats from code so stats.name matches the @board <name> directive.
  // The projection in `projectboardcodepage` deletes `stats` from the wire
  // (clients re-parse locally from `code`), so the hydrated page arrives
  // without stats. If we don't re-parse here, subsequent lookups that match
  // by NAME(stats.name) fail and every cardinal/corner exit resolves to ''.
  const stats = memoryreadcodepagestats(codepage)
  // Force type to BOARD in case the code parser couldn't infer it (e.g. the
  // code is empty and memoryreadcodepagestats defaulted stats.type to OBJECT).
  // This stream is `board:<id>`, so the contract guarantees this codepage is
  // a BOARD.
  if (stats.type !== CODE_PAGE_TYPE.BOARD) {
    stats.type = CODE_PAGE_TYPE.BOARD
  }
  const incomingboard = document.board as Record<string, unknown> | undefined
  if (!ispresent(incomingboard) || typeof incomingboard !== 'object') {
    return
  }
  const cloned = deepcopy(incomingboard) as unknown as BOARD
  // ensure id is present for downstream consumers (memoryresetboardlookups
  // doesn't require it, but every other helper does).
  if (!cloned.id) {
    cloned.id = boardid
  }
  codepage.board = cloned
  // rebuild lookup/named caches and resolve element kinds. This is the same
  // shape memoryinitboard runs after a board is freshly loaded server-side.
  memoryinitboard(codepage.board)
}
