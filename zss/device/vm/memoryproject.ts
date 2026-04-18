/*
memoryproject: pure projections from MEMORY into jsonsync-shippable plain
objects. Lives below memorysync (server-side) and memoryworkersync
(worker-side) so neither side has to depend on the other's transport-only
helpers (jsonsyncserver vs jsonsyncclient). All projections are deepcopy-safe
and never mutate live MEMORY references.
*/
import { deepcopy, isarray, ispresent } from 'zss/mapping/types'
import { boardstreamid as boardstreamidbyid } from 'zss/memory/memorydirty'
import { memoryreadroot } from 'zss/memory/session'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'

export function boardstreamid(codepage: CODE_PAGE): string {
  return boardstreamidbyid(codepage.id)
}

// what ships in the `memory` stream.
// - `halt` is the dev-mode flag (#dev): when on, runners still tick player
//   objects but skip everything else (`memorytickboard`'s playeronly path).
//   runners must observe it locally to gate their own ticks the same way.
// - `simfreeze` IS included: clients need to know when the sim is paused for
//   async loads so they can pause their local tick.
// - `loaders` is server-local async state; `topic` is routing metadata; both
//   are excluded.
export const MEMORY_SYNC_TOPKEYS = [
  'session',
  'operator',
  'software',
  'books',
  'halt',
  'simfreeze',
] as const

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
  'charsetpage',
  'palettepage',
]

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

// flag sub-keys the boardrunner worker owns exclusively. they live on
// book.flags[id][name] and mutate every tick (inputqueue is consumed by the
// firmware; inputcurrent is tick-local and cleared in memorytickobject, which
// the server does not run for boards under Phase 2 — so it would go stale on
// the canonical doc and hydrate back onto the worker blocking readinput).
// synthstate/synthplay are owned by the synth device. shipping these over the
// memory stream would (a) burn diff cycles for no reason and (b) let the
// server clobber live worker state on hydrate. memoryhydrate.ts preserves
// these same keys when replacing `book.flags` so the round-trip is safe.
export const VOLATILE_FLAG_KEYS: readonly string[] = [
  'inputqueue',
  'inputcurrent',
  'synthstate',
  'synthplay',
]

// Outer flag ids that are entirely worker-local and must never round-trip
// through the memory stream. `gadgetstore` holds per-player scroll/sidebar
// content authored by scroll-producing vm handlers on sim and mirrored to
// the elected boardrunner worker via `boardrunner:gadgetscrollpush`. Each
// realm maintains its own copy (sim for hyperlink bridge dispatch, worker
// for UI paint via boardrunnergadgetsynctick). Projecting it up would let
// sim's (potentially partial) view clobber the worker's authoritative view
// on hydrate — memoryhydrate deletes worker entries not present in incoming.
export const VOLATILE_FLAG_IDS: readonly string[] = ['gadgetstore']

function stripvolatileflags(
  flags: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const ids = Object.keys(flags)
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]
    if (VOLATILE_FLAG_IDS.includes(id)) {
      continue
    }
    const entry = flags[id]
    if (!ispresent(entry) || typeof entry !== 'object') {
      out[id] = entry
      continue
    }
    const src = entry as Record<string, unknown>
    const dst: Record<string, unknown> = {}
    const keys = Object.keys(src)
    for (let j = 0; j < keys.length; ++j) {
      const key = keys[j]
      if (VOLATILE_FLAG_KEYS.includes(key)) {
        continue
      }
      dst[key] = src[key]
    }
    out[id] = dst
  }
  return out
}

// convert a BOOK for the `memory` stream: deepcopy, strip board-type codepages
// from `pages` (they travel via their own board:${id} streams), drop
// `timestamp` (server-local clock metadata; clients re-derive cadence from
// `ticktock`), and strip VOLATILE_FLAG_KEYS from every flags[id] record so
// worker-local queues never round-trip through the server.
function projectbook(book: BOOK): unknown {
  const copy = deepcopy(book) as unknown as Record<string, unknown>
  const pages = copy.pages as CODE_PAGE[] | undefined
  if (ispresent(pages)) {
    copy.pages = pages.filter((page) => {
      const t = page.stats?.type
      return t !== CODE_PAGE_TYPE.BOARD
    })
  }
  if (ispresent(copy.flags) && typeof copy.flags === 'object') {
    copy.flags = stripvolatileflags(copy.flags as Record<string, unknown>)
  }
  delete copy.timestamp
  return copy
}

// project the MEMORY root into a jsonsync-shippable plain object.
// - top-level keys filtered to MEMORY_SYNC_TOPKEYS
// - books Map -> Record<bookid, BOOK>, each BOOK filtered via projectbook
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
