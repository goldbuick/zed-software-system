/*
memoryproject: pure projections from MEMORY into jsonsync-shippable plain
objects, plus sim-side unproject (merge accepted rxrepl rows back into the
canonical MEMORY singleton). Lives below memorysync (server-side) and
memoryworkersync (worker-side) so neither side depends on the other's
transport-only helpers. Projections are deepcopy-safe and never mutate live
MEMORY references; unproject mutates MEMORY under `memorywithsilentwrites`.

--- Wire contract (read before changing sync key lists) ---

Streams (see `routememoryjsonsyncdocument`):
- `memory` — Root allowlist: MEMORY_SYNC_TOPKEYS. Excludes `loaders`, `topic`
  (server-only / routing; see `MEMORY_ROOT` in `zss/memory/session.ts`). Books
  are projected with BOARD codepages as **shells only**; full board bodies
  replicate on `board:<id>`. Main-book flags omit per-player ids and
  `gadgetstore` (those use `flags:<pid>` / `gadget:<pid>`).
- `board:<id>` — BOARD field allowlist: BOARD_SYNC_TOPKEYS; elements use
  BOARD_ELEMENT_SYNC_TOPKEYS (aligned with `memoryexportboardelement`).
- `flags:<pid>`, `gadget:<pid>` — full bags / gadget doc via `projectplayerflags` /
  `projectgadget`.

**Authoritative `memory.books`:** `hydratememory` and `unprojectmemory` both
remove local books whose id is **absent** from the incoming `books` object. Every
`projectmemory()` must therefore include the full set of book ids; partial book
lists are undefined behavior and can delete worker/sim state (see
`memoryhydrate` tests: “removes worker-local books…”, “drops BOARD page when…”).

**Client notify path (board streams):** After `applystreamrow` with replication
on, the Rx mirror is updated in `streamreplmirrorsetnonotify` and
`streamreplreplicationfeedstreamrow`; if Rx `received$` does not run for a no-op
rev, `streamreplnotifymirrorstreamrowrepl` in `zss/device/netsim.ts` still emits
`streamid:changed` so `memoryhydratefromjsonsync` runs on the boardrunner
worker. Seed `lastreplicationnotifyrev` so `streamreplmirroronreplicationdown`
dedupes if `received$` later fires for the same rev.

--- Adding persisted fields that must cross the wire ---

1. Add to the appropriate `*_SYNC_TOPKEYS` (and keep `unprojectboardstream`
   overlay in sync for sim-side patches, or ensure hydrate replaces the field).
2. `BOARD` / `BOARD_ELEMENT` in `zss/memory/types.ts` may include **runtime**
   fields intentionally **not** listed here (e.g. `named`, `lookup`, `distmaps`,
   `drawlastfp` on BOARD; `displaychar`, `kinddata`, `sender`, `removed` on
   elements). Clients rebuild those after `memoryinitboard` / tick — they are
   not shipped on `board:<id>`.
*/
import { initstate } from 'zss/gadget/data/api'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import { ispid } from 'zss/mapping/guid'
import { deepcopy, isarray, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadbookflags } from 'zss/memory/bookoperations'
import { memoryreadcodepagebyid } from 'zss/memory/codepages'
import {
  boardfromboardstream,
  boardstream,
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
} from 'zss/memory/session'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  BOOK_FLAGS,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  MEMORY_LABEL,
} from 'zss/memory/types'

import {
  hydrateboard,
  hydrategadget,
  hydratememory,
  hydrateplayerflags,
} from './memoryhydrateimpl'
import {
  BOOK_WIRE_SCALAR_KEYS,
  mergebookpagesfrommemoryprojection,
  mergeflagspreservingvolatile,
} from './memorywiremerge'

// ---------------------------------------------------------------------------
// stream ids
// ---------------------------------------------------------------------------

export function boardstreamfromcodepage(codepage: CODE_PAGE): string {
  return boardstream(codepage.id)
}

// ---------------------------------------------------------------------------
// shared projection contracts (constants)
// ---------------------------------------------------------------------------

// what ships in the `memory` stream.
// - `halt` is the dev-mode flag (#dev): when on, runners still tick player
//   objects but skip everything else (`memorytickboard`'s playeronly path).
//   runners must observe it locally to gate their own ticks the same way.
// - `freeze` IS included: clients need to know when the sim is paused for
//   async loads so they can pause their local tick.
// - `loaders` is server-local async state; `topic` is routing metadata; both
//   are excluded.
export const MEMORY_SYNC_TOPKEYS = [
  'session',
  'operator',
  'software',
  'books',
  'halt',
  'freeze',
] as const

// Not in MEMORY_SYNC_TOPKEYS (intentional): `loaders`, `topic` on `MEMORY_ROOT`.

// Root scalars applied on sim unproject (books handled separately).
const MEMORY_UNPROJECT_SCALAR_KEYS: readonly string[] = [
  'freeze',
  'halt',
  'operator',
  'session',
  'software',
]

// BOARD fields every client needs to render / step the board. runtime caches
// (draw fingerprints, distmaps, named/lookup indexes) are excluded because
// clients rebuild them locally.
export const BOARD_SYNC_TOPKEYS: readonly string[] = [
  'id',
  'name',
  'isdark',
  'startx',
  'starty',
  'over',
  'under',
  'camera',
  'graphics',
  'facing',
  'charset',
  'palette',
  'charsetpage',
  'palettepage',
  'exitnorth',
  'exitsouth',
  'exitwest',
  'exiteast',
  'timelimit',
  'restartonzap',
  'maxplayershots',
  'b1',
  'b2',
  'b3',
  'b4',
  'b5',
  'b6',
  'b7',
  'b8',
  'b9',
  'b10',
  'terrain',
  'objects',
  'overboard',
  'underboard',
]

// Intentionally omitted from BOARD (see `BOARD` in `zss/memory/types.ts`):
// runtime caches — `named`, `lookup`, `distmaps`, `drawlastfp`, `drawlastxy`,
// `drawallowids`, `drawneedfull` — rebuilt locally after `memoryinitboard` / tick.

// BOARD_ELEMENT fields that travel over the wire. mirrors the keep-list of
// memoryexportboardelement in zss/memory/boardelement.ts: persisted identity,
// display, interaction, and config state. runtime fields (kinddata, category,
// display* overrides, didfail, removed, sender, arg) are rebuilt/derived on
// the client.
export const BOARD_ELEMENT_SYNC_TOPKEYS: readonly string[] = [
  'kind',
  'id',
  'x',
  'y',
  'lx',
  'ly',
  'code',
  'name',
  'char',
  'color',
  'bg',
  'light',
  'lightdir',
  'item',
  'group',
  'party',
  'player',
  'pushable',
  'collision',
  'breakable',
  'tickertext',
  'tickertime',
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'p7',
  'p8',
  'p9',
  'p10',
  'cycle',
  'stepx',
  'stepy',
  'shootx',
  'shooty',
]

// Omitted (runtime or message ephemera on `BOARD_ELEMENT`): `displaychar`,
// `displaycolor`, `displaybg`, `displayname`, `sender`, `arg`, `didfail`,
// `category`, `kinddata`, `removed`, `bucket`, `stopped` — see type + comments
// in `zss/memory/types.ts` and `zss/memory/boardelement.ts` export path.

// ---------------------------------------------------------------------------
// MEMORY stream — project / unproject
// ---------------------------------------------------------------------------

function picktopkeys(
  source: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (let i = 0; i < keys.length; ++i) {
    const k = keys[i]
    if (Object.prototype.hasOwnProperty.call(source, k)) {
      out[k] = source[k]
    }
  }
  return out
}

function projectboardelement(el: BOARD_ELEMENT): Record<string, unknown> {
  return picktopkeys(
    el as unknown as Record<string, unknown>,
    BOARD_ELEMENT_SYNC_TOPKEYS,
  )
}

function projectboard(board: BOARD): unknown {
  const copy = deepcopy(board) as unknown as Record<string, unknown>
  const trimmed = picktopkeys(copy, BOARD_SYNC_TOPKEYS)
  // terrain is MAYBE<BOARD_ELEMENT>[]: preserve holes so index === tile coord
  // math (y * width + x) still holds on the client.
  if (isarray(trimmed.terrain)) {
    trimmed.terrain = (trimmed.terrain as (BOARD_ELEMENT | undefined)[]).map(
      (entry) => (ispresent(entry) ? projectboardelement(entry) : entry),
    )
  }
  // objects is Record<id, BOARD_ELEMENT>: rebuild the record keyed by id.
  if (ispresent(trimmed.objects) && typeof trimmed.objects === 'object') {
    const src = trimmed.objects as Record<string, BOARD_ELEMENT>
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(src)) {
      out[k] = projectboardelement(src[k])
    }
    trimmed.objects = out
  }
  return trimmed
}

function isboardcodepageforprojection(page: CODE_PAGE): boolean {
  return page.stats?.type === CODE_PAGE_TYPE.BOARD || ispresent(page.board)
}

// convert a BOOK for the `memory` stream: deepcopy, project BOARD pages as
// shells (id/code/stats.type); full bodies use `board:${id}` streams. drop
// `timestamp` (server-local clock metadata; clients re-derive cadence from
// `ticktock`). flags are taken from the deepcopy as-is (gadgetstore and per-
// player ids on the main book are still removed below).
function projectbook(book: BOOK): unknown {
  const copy = deepcopy(book) as unknown as Record<string, unknown>
  const pages = copy.pages as CODE_PAGE[] | undefined
  if (ispresent(pages)) {
    copy.pages = pages.map((page) =>
      isboardcodepageforprojection(page)
        ? projectboardcodepageformemoryshell(page)
        : page,
    )
  }
  if (ispresent(copy.flags) && typeof copy.flags === 'object') {
    delete (copy.flags as Record<string, unknown>)[MEMORY_LABEL.GADGETSTORE]
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    if (ispresent(mainbook) && book.id === mainbook.id) {
      const projectedflags = copy.flags as Record<string, unknown>
      const flagkeys = Object.keys(projectedflags)
      for (let i = 0; i < flagkeys.length; ++i) {
        const fk = flagkeys[i]
        if (ispid(fk)) {
          delete projectedflags[fk]
        }
      }
    }
  }
  delete copy.timestamp
  return copy
}

// project the MEMORY root into a jsonsync-shippable plain object.
// - top-level keys filtered to MEMORY_SYNC_TOPKEYS
// - books Map -> Record<bookid, BOOK>, each BOOK via projectbook (BOARD shells)
// - loaders (excluded by allowlist) and topic/halt never appear
export function projectmemory(): unknown {
  const root = memoryreadroot() as unknown as Record<string, unknown>
  const picked = picktopkeys(root, MEMORY_SYNC_TOPKEYS as readonly string[])
  if (picked.books instanceof Map) {
    const record: Record<string, unknown> = {}
    for (const [id, book] of picked.books.entries()) {
      record[id] = projectbook(book as BOOK)
    }
    picked.books = record
  }
  return picked
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

function mergebookscalars(book: BOOK, incoming: Record<string, unknown>): void {
  for (let i = 0; i < BOOK_WIRE_SCALAR_KEYS.length; ++i) {
    const key = BOOK_WIRE_SCALAR_KEYS[i]
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
  book.flags = mergeflagspreservingvolatile(
    book.flags,
    flags as Record<string, Record<string, unknown>>,
    book.activelist ?? [],
  )
}

export function unprojectmemory(document: Record<string, unknown>): void {
  const root = memoryreadroot() as unknown as Record<string, unknown>
  for (let i = 0; i < MEMORY_UNPROJECT_SCALAR_KEYS.length; ++i) {
    const key = MEMORY_UNPROJECT_SCALAR_KEYS[i]
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
      // Memory stream `pages` include BOARD shells; bodies replicate on
      // `board:<id>` streams and unproject separately.
      const created = createbookfromincoming(bookid, incomingbook)
      if (ispresent(created)) {
        memorywritebook(created)
      }
      continue
    }
    mergebookscalars(localbook, incomingbook)
    mergebookflags(localbook, incomingbook)
    mergebookpagesfrommemoryprojection(localbook, incomingbook.pages)
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

// ---------------------------------------------------------------------------
// BOARD stream — project / unproject
// ---------------------------------------------------------------------------

/** BOARD row on the `memory` stream: id, code, and `stats.type` only (no `board` body). */
export function projectboardcodepageformemoryshell(
  codepage: CODE_PAGE,
): Record<string, unknown> {
  return {
    id: codepage.id,
    code: typeof codepage.code === 'string' ? codepage.code : '',
    stats: { type: CODE_PAGE_TYPE.BOARD },
  }
}

// return a new CODE_PAGE copy safe to sync: deepcopy, trim the embedded BOARD
// (if any) to the runtime-free top keys, and drop `stats` since clients
// re-parse it locally from `code`. non-board fields (object, terrain, charset,
// palette) are left intact.
export function projectboardcodepage(codepage: CODE_PAGE): unknown {
  const copy = deepcopy(codepage) as unknown as Record<string, unknown>
  if (ispresent(copy.board)) {
    copy.board = projectboard(copy.board as BOARD)
  }
  delete copy.stats
  return copy
}

/** Resolve a `board:<id>` stream id to the live codepage (if any). */
export function codepagefromboardstream(stream: string): CODE_PAGE | undefined {
  if (!isboardstream(stream)) {
    return undefined
  }
  const id = boardfromboardstream(stream)
  if (!id) {
    return undefined
  }
  return memoryreadcodepagebyid(id)
}

export function unprojectboardstream(
  streamid: string,
  document: Record<string, unknown>,
): void {
  const codepage = codepagefromboardstream(streamid)
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

// ---------------------------------------------------------------------------
// GADGET stream — project / unproject
// ---------------------------------------------------------------------------

/** Full-document gadget stream: one player's `GADGET_STATE` from main book gadgetstore. */
export function projectgadget(player: string): GADGET_STATE {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const gadgetstore = memoryreadbookflags(
    mainbook,
    MEMORY_LABEL.GADGETSTORE,
  ) as unknown as Record<string, GADGET_STATE>
  const raw = gadgetstore[player]
  if (!ispresent(raw)) {
    return initstate()
  }
  return deepcopy(raw)
}

export function unprojectgadget(player: string, document: unknown): void {
  if (!ispresent(document) || typeof document !== 'object') {
    return
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const gadgetstore = memoryreadbookflags(
    mainbook,
    MEMORY_LABEL.GADGETSTORE,
  ) as Record<string, unknown>
  gadgetstore[player] = deepcopy(document) as BOOK_FLAGS[string]
}

// ---------------------------------------------------------------------------
// FLAGS stream — project / unproject
// ---------------------------------------------------------------------------

/** Full-document flags stream: one player's flag bag from the main book. */
export function projectplayerflags(player: string): Record<string, unknown> {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return {}
  }
  const raw = memoryreadbookflags(mainbook, player) as unknown as Record<
    string,
    unknown
  >
  if (!ispresent(raw) || typeof raw !== 'object') {
    return {}
  }
  return deepcopy(raw)
}

export function unprojectplayerflags(player: string, document: unknown): void {
  if (!ispresent(document) || typeof document !== 'object') {
    return
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  mergeflagspreservingvolatile(
    mainbook.flags,
    {
      [player]: document as Record<string, unknown>,
    },
    mainbook.activelist ?? [],
  )
}

// ---------------------------------------------------------------------------
// jsonsync stream dispatch (hydrate + unproject)
// ---------------------------------------------------------------------------

/** How `routememoryjsonsyncdocument` applies a row body to MEMORY. */
export type MemoryJsonSyncMode = 'hydrate' | 'unproject'

/** Inbound jsonsync document for a single stream row (parsed JSON body). */
export type MemoryJsonWireDocument = Record<string, unknown>

export type RoutememoryJsonSyncOpts = {
  mode: MemoryJsonSyncMode
}

/**
 * Single stream-id dispatch for jsonsync MEMORY writes.
 *
 * | Stream        | hydrate (worker) | unproject (sim) |
 * |---------------|------------------|-----------------|
 * | memory        | session writers + create books + merge pages/flags; may delete unknown books | root scalar assign + software shallow-merge + same book merge + delete absent books |
 * | board:<id>    | create page if needed, memoryinitboard, stats from code | overlay BOARD_SYNC_TOPKEYS onto existing board only (no initboard) |
 * | gadget:<pid>  | replace gadgetstore[player] | same |
 * | flags:<pid>   | mergeplayerflagsstreamhydrate (overlay) | mergeflagspreservingvolatile |
 *
 * Caller wraps `memorywithsilentwrites` where appropriate.
 */
export function routememoryjsonsyncdocument(
  stream: string,
  document: MemoryJsonWireDocument,
  opts: RoutememoryJsonSyncOpts,
): void {
  const { mode } = opts
  if (ismemorystream(stream)) {
    if (mode === 'hydrate') {
      hydratememory(document)
    } else {
      unprojectmemory(document)
    }
    return
  }
  if (isboardstream(stream)) {
    const boardid = boardfromboardstream(stream)
    if (boardid) {
      if (mode === 'hydrate') {
        hydrateboard(boardid, document)
      } else {
        unprojectboardstream(stream, document)
      }
    }
    return
  }
  if (isgadgetstream(stream)) {
    const player = playerfromgadgetstream(stream)
    if (player) {
      if (mode === 'hydrate') {
        hydrategadget(player, document)
      } else {
        unprojectgadget(player, document)
      }
    }
    return
  }
  if (isflagsstream(stream)) {
    const player = playerfromflagsstream(stream)
    if (player) {
      if (mode === 'hydrate') {
        hydrateplayerflags(player, document)
      } else {
        unprojectplayerflags(player, document)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// dispatch (sim rxrepl merge)
// ---------------------------------------------------------------------------

export function unprojectstream(stream: string, document: unknown): void {
  if (!ispresent(document) || typeof document !== 'object') {
    return
  }
  memorywithsilentwrites(() => {
    routememoryjsonsyncdocument(stream, document as MemoryJsonWireDocument, {
      mode: 'unproject',
    })
  })
}
