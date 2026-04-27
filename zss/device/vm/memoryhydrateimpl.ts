/*
Worker-side hydrate implementations (see `memoryhydrate.ts` module header).
Split from the public entry so `memoryproject` can route streams without a
circular import back into `memoryhydrate`.
*/
import { deepcopy, isarray, ispresent } from 'zss/mapping/types'
import { memoryinitboard } from 'zss/memory/boards'
import { memoryreadcodepagestats } from 'zss/memory/codepageoperations'
import { creategadgetmemid } from 'zss/memory/flagmemids'
import { memoryreadmergesynthpreserveboard } from 'zss/memory/mergecontext'
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

import {
  BOOK_WIRE_SCALAR_KEYS,
  mergebookpagesfrommemoryprojection,
  mergeflagspreservingvolatile,
  mergeplayerflagsstreamhydrate,
} from './memorywiremerge'

/** Board stream rows can arrive before `memory` sets `software.main`; keep latest doc per id until flush. */
const pendingboardhydratedocuments = new Map<string, Record<string, unknown>>()

function flushpendingboardhydrates(): void {
  if (!ispresent(memoryreadbookbysoftware(MEMORY_LABEL.MAIN))) {
    return
  }
  if (pendingboardhydratedocuments.size === 0) {
    return
  }
  const entries = [...pendingboardhydratedocuments.entries()]
  pendingboardhydratedocuments.clear()
  for (let i = 0; i < entries.length; ++i) {
    const [boardid, document] = entries[i]
    hydrateboard(boardid, document)
  }
}

export function hydrategadget(
  player: string,
  document: Record<string, unknown>,
): void {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  mainbook.flags[creategadgetmemid(player)] = deepcopy(document) as BOOK_FLAGS
}

export function hydrateplayerflags(
  player: string,
  document: Record<string, unknown>,
): void {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  mergeplayerflagsstreamhydrate(mainbook.flags, player, document)
}

export function hydratememory(document: Record<string, unknown>): void {
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
  flushpendingboardhydrates()
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

function mergebookinto(book: BOOK, incoming: Record<string, unknown>): void {
  for (let i = 0; i < BOOK_WIRE_SCALAR_KEYS.length; ++i) {
    const key = BOOK_WIRE_SCALAR_KEYS[i]
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
        {
          kind: 'worker',
          preservesynthforboard: memoryreadmergesynthpreserveboard(),
        },
      )
    }
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'pages')) {
    mergebookpagesfrommemoryprojection(book, incoming.pages)
  }
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
export function hydrateboard(
  boardid: string,
  document: Record<string, unknown>,
): void {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    pendingboardhydratedocuments.set(boardid, deepcopy(document))
    return
  }
  pendingboardhydratedocuments.delete(boardid)
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
