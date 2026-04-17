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
*/
import {
  jsonsyncserveradmitplayer,
  jsonsyncserverreadstream,
  jsonsyncserverregister,
  jsonsyncserverupdate,
} from 'zss/device/jsonsyncserver'
import { deepcopy, isarray, ispresent, isstring } from 'zss/mapping/types'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { memoryreadroot } from 'zss/memory/session'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'

export const MEMORY_STREAM_ID = 'memory'

export function boardstreamid(codepage: CODE_PAGE): string {
  return `board:${codepage.id}`
}

// what ships in the `memory` stream. halt is a server-local shutdown flag;
// loaders is server-local async state; topic is routing metadata. simfreeze
// IS included: clients need to know when the sim is paused for async loads.
export const MEMORY_SYNC_TOPKEYS = [
  'session',
  'operator',
  'software',
  'books',
  'halt',
] as const

// BOARD fields every client needs to render / step the board. runtime caches
// (draw fingerprints, distmaps, named/lookup indexes) are excluded because
// clients rebuild them locally.
const BOARD_SYNC_TOPKEYS: readonly string[] = [
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
]

// BOARD_ELEMENT fields that travel over the wire. mirrors the keep-list of
// memoryexportboardelement in zss/memory/boardelement.ts: persisted identity,
// display, interaction, and config state. runtime fields (kinddata, category,
// display* overrides, didfail, removed, sender, arg) are rebuilt/derived on
// the client.
const BOARD_ELEMENT_SYNC_TOPKEYS: readonly string[] = [
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

// convert a BOOK for the `memory` stream: deepcopy, strip board-type codepages
// from `pages` (they travel via their own board:${id} streams), leave the rest
// intact so clients keep the full list of objects/terrain/charset/palette
// codepages referenced by elements via `kind`.
function projectbook(book: BOOK): unknown {
  const copy = deepcopy(book) as unknown as Record<string, unknown>
  const pages = copy.pages as CODE_PAGE[] | undefined
  if (ispresent(pages)) {
    copy.pages = pages.filter((page) => {
      const t = page.stats?.type
      return t !== CODE_PAGE_TYPE.BOARD
    })
  }
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

// VM tick hooks (intentionally not wired into the tick loop here; callers
// decide when to push. integration into the tick is a follow-up task).
export function memorysyncupdatememory(): void {
  jsonsyncserverupdate(MEMORY_STREAM_ID, projectmemory())
}

export function memorysyncupdateboard(codepage: CODE_PAGE): void {
  jsonsyncserverupdate(boardstreamid(codepage), projectboardcodepage(codepage))
}
