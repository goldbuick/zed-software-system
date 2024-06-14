import { WORD_VALUE } from 'zss/chip'
import { PT, COLLISION, CATEGORY } from 'zss/firmware/wordtypes'
import { unique } from 'zss/mapping/array'
import { createsid, createnameid } from 'zss/mapping/guid'
import { TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, MAYBE_STRING, ispresent } from 'zss/mapping/types'

import { checkcollision } from './atomics'
import {
  MAYBE_BOARD,
  MAYBE_BOARD_ELEMENT,
  boarddeleteobject,
  boardobjectread,
} from './board'
import {
  CODE_PAGE,
  CODE_PAGE_TYPE,
  CODE_PAGE_TYPE_MAP,
  MAYBE_CODE_PAGE,
  codepagereaddata,
  codepagereadname,
  codepagereadstatdefaults,
  codepagereadtype,
} from './codepage'

// player state
export type BOOK_FLAGS = Record<string, WORD_VALUE>

// player location tracking
export type BOOK_PLAYER = string

export type BOOK = {
  id: string
  name: string
  pages: CODE_PAGE[]
  flags: Record<string, BOOK_FLAGS>
  players: Record<string, BOOK_PLAYER>
}

export type MAYBE_BOOK = MAYBE<BOOK>

export function createbook(pages: CODE_PAGE[]): BOOK {
  return {
    id: createsid(),
    name: createnameid(),
    pages,
    flags: {},
    players: {},
  }
}

export function bookfindcodepage(
  book: MAYBE_BOOK,
  address: string,
): MAYBE_CODE_PAGE {
  if (!ispresent(book)) {
    return undefined
  }

  const laddress = address.toLowerCase()
  const codepage = book.pages.find(
    (item) => item.id === address || laddress === codepagereadname(item),
  )

  return codepage
}

export function bookreadcodepage(
  book: MAYBE_BOOK,
  type: CODE_PAGE_TYPE,
  address: string,
): MAYBE_CODE_PAGE {
  if (!ispresent(book)) {
    return undefined
  }

  const laddress = address.toLowerCase()
  const codepage = book.pages.find(
    (item) =>
      codepagereadtype(item) === type &&
      (item.id === address || laddress === codepagereadname(item)),
  )

  return codepage
}

export function bookwritecodepage(
  book: MAYBE_BOOK,
  codepage: MAYBE_CODE_PAGE,
): boolean {
  if (!ispresent(book) || !ispresent(codepage)) {
    return false
  }

  const existing = bookfindcodepage(book, codepage.id)
  if (ispresent(existing)) {
    return false
  }

  book.pages.push(codepage)

  return true
}

export function bookclearcodepage(book: MAYBE_BOOK, address: string) {
  const codepage = bookfindcodepage(book, address)
  if (ispresent(book) && ispresent(codepage)) {
    const laddress = address.toLowerCase()
    book.pages = book.pages.filter(
      (item) => item.id !== address && laddress !== codepagereadname(item),
    )
    return codepage
  }
}

export function bookreadcodepagedata<T extends CODE_PAGE_TYPE>(
  book: MAYBE_BOOK,
  type: T,
  address: string,
): MAYBE<CODE_PAGE_TYPE_MAP[T]> {
  const codepage = bookreadcodepage(book, type, address)
  return codepagereaddata(codepage)
}

export function bookelementkindread(
  book: MAYBE_BOOK,
  element: MAYBE_BOARD_ELEMENT,
) {
  if (ispresent(element) && ispresent(element.kind)) {
    if (!ispresent(element.kinddata)) {
      element.kinddata = ispresent(element.id)
        ? bookreadobject(book, element.kind)
        : bookreadterrain(book, element.kind)
    }
    return element.kinddata
  }
  return undefined
}

export function bookreadobject(
  book: MAYBE_BOOK,
  maybeobject: MAYBE_STRING,
): MAYBE_BOARD_ELEMENT {
  const object = maybeobject ?? ''
  const page = bookreadcodepage(book, CODE_PAGE_TYPE.OBJECT, object)
  const data = bookreadcodepagedata(book, CODE_PAGE_TYPE.OBJECT, object)
  if (ispresent(page)) {
    const stats = codepagereadstatdefaults(page)
    return {
      ...data,
      ...stats,
      name: object,
      code: page.code,
    }
  } else {
    return undefined
  }
}

export function bookreadterrain(
  book: MAYBE_BOOK,
  maybeterrain: MAYBE_STRING,
): MAYBE_BOARD_ELEMENT {
  const terrain = maybeterrain ?? ''
  const page = bookreadcodepage(book, CODE_PAGE_TYPE.TERRAIN, terrain)
  const data = bookreadcodepagedata(book, CODE_PAGE_TYPE.TERRAIN, terrain)
  if (ispresent(page)) {
    const stats = codepagereadstatdefaults(page)
    return {
      ...data,
      ...stats,
      name: terrain,
      code: page.code,
    }
  } else {
    return undefined
  }
}

export function bookreadboard(book: MAYBE_BOOK, board: string): MAYBE_BOARD {
  return bookreadcodepagedata(book, CODE_PAGE_TYPE.BOARD, board)
}

export function bookreadflags(book: MAYBE_BOOK, player: string) {
  if (!book) {
    return undefined
  }
  book.flags[player] = book.flags[player] ?? {}
  return book.flags[player]
}

export function bookreadflag(book: MAYBE_BOOK, player: string, name: string) {
  const flags = bookreadflags(book, player)
  return flags?.[name]
}

export function booksetflag(
  book: MAYBE_BOOK,
  player: string,
  name: string,
  value: WORD_VALUE,
) {
  const flags = bookreadflags(book, player)
  if (flags) {
    flags[name] = value
  }
  return value
}

export function bookplayerreadboard(book: MAYBE_BOOK, player: string) {
  return bookreadboard(book, book?.players[player] ?? '')
}

export function bookplayersetboard(
  book: MAYBE_BOOK,
  player: string,
  board: string,
) {
  if (ispresent(book) && ispresent(bookreadboard(book, board))) {
    book.players[player] = board
  }
}

export function bookplayerreadboards(book: MAYBE_BOOK) {
  return unique(Object.values(book?.players ?? []))
    .map((address) => bookreadboard(book, address))
    .filter(ispresent)
}

export function bookboardmoveobject(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
  dest: PT,
): MAYBE_BOARD_ELEMENT {
  const object = boardobjectread(board, target?.id ?? '')

  // first pass clipping
  if (
    !ispresent(book) ||
    !ispresent(board) ||
    !ispresent(object) ||
    !ispresent(object.x) ||
    !ispresent(object.y) ||
    !ispresent(board.lookup) ||
    dest.x < 0 ||
    dest.x >= board.width ||
    dest.y < 0 ||
    dest.y >= board.height
  ) {
    // for sending interaction messages
    return { kind: 'edge', collision: COLLISION.SOLID, x: dest.x, y: dest.y }
  }

  // second pass, are we actually trying to move ?
  if (object.x - dest.x === 0 && object.y - dest.y === 0) {
    // no interaction due to no movement
    return undefined
  }

  // gather meta for move
  const idx = dest.x + dest.y * board.width
  const targetkind = bookelementkindread(book, object)
  const targetcollision = object.collision ?? targetkind?.collision

  // blocked by an object
  const maybeobject = boardobjectread(board, board.lookup[idx] ?? '')
  if (ispresent(maybeobject)) {
    // for sending interaction messages
    return { ...maybeobject }
  }

  // blocked by terrain
  const mayberterrain = board.terrain[idx]
  if (ispresent(mayberterrain)) {
    const terrainkind = bookelementkindread(book, mayberterrain)
    const terraincollision = mayberterrain.collision ?? terrainkind?.collision
    if (checkcollision(targetcollision, terraincollision)) {
      // for sending interaction messages
      return { ...mayberterrain, x: dest.x, y: dest.y }
    }
  }

  // update object location
  object.x = dest.x
  object.y = dest.y

  // if not removed, update lookup
  if (!ispresent(object.removed)) {
    // blank current lookup
    board.lookup[idx] = undefined

    // update lookup
    board.lookup[object.x + object.y * board.width] = object.id ?? ''
  }

  // no interaction
  return undefined
}

export function bookboardelementreadname(
  book: MAYBE_BOOK,
  element: MAYBE_BOARD_ELEMENT,
) {
  const kind = bookelementkindread(book, element)
  if (ispresent(element?.id) && ispresent(element.x) && ispresent(element.y)) {
    return (element.name ?? kind?.name ?? 'object').toLowerCase()
  }
  return (element?.name ?? kind?.name ?? 'terrain').toLowerCase()
}

export function bookboardnamedwrite(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  element: MAYBE_BOARD_ELEMENT,
  index?: number,
) {
  // invalid data
  if (
    !ispresent(book) ||
    !ispresent(board) ||
    !ispresent(board.named) ||
    !ispresent(element)
  ) {
    return
  }
  // update named
  const name = bookboardelementreadname(book, element)
  if (!board.named[name]) {
    board.named[name] = new Set<string>()
  }
  // object.id or terrain index
  board.named[name].add(element?.id ?? index ?? '')
}

export function bookboardobjectlookupwrite(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  object: MAYBE_BOARD_ELEMENT,
) {
  // invalid data
  if (
    !ispresent(book) ||
    !ispresent(board) ||
    !ispresent(board.lookup) ||
    !ispresent(object?.id)
  ) {
    return
  }
  // update object lookup
  if (!ispresent(object.removed)) {
    const x = object.x ?? 0
    const y = object.y ?? 0
    board.lookup[x + y * board.width] = object.id
  }
}

export function bookboardsetlookup(book: MAYBE_BOOK, board: MAYBE_BOARD) {
  // invalid data
  if (!ispresent(book) || !ispresent(board)) {
    return
  }

  // already cached
  if (ispresent(board.lookup) && ispresent(board.named)) {
    return
  }

  // build initial cache
  const lookup: string[] = new Array(board.width * board.height).fill(undefined)
  const named: Record<string, Set<string | number>> = {}

  // add objects to lookup & to named
  const objects = Object.values(board.objects)
  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]
    if (
      ispresent(object.x) &&
      ispresent(object.y) &&
      ispresent(object.id) &&
      !ispresent(object.removed)
    ) {
      // add category
      object.category = CATEGORY.OBJECT

      // update lookup
      lookup[object.x + object.y * board.width] = object.id

      // update named lookup
      const name = bookboardelementreadname(book, object)
      if (!named[name]) {
        named[name] = new Set<string>()
      }
      named[name].add(object.id)
    }
  }

  // add terrain to named
  let x = 0
  let y = 0
  for (let i = 0; i < board.terrain.length; ++i) {
    const terrain = board.terrain[i]
    if (ispresent(terrain)) {
      // add coords
      terrain.x = x
      terrain.y = y
      terrain.category = CATEGORY.TERRAIN

      // update named lookup
      const name = bookboardelementreadname(book, terrain)
      if (!named[name]) {
        named[name] = new Set<string>()
      }
      named[name].add(i)
    }
    ++x
    if (x >= board.width) {
      x = 0
      ++y
    }
  }

  board.lookup = lookup
  board.named = named
}

export function bookboardobjectsafedelete(
  book: MAYBE_BOOK,
  object: MAYBE_BOARD_ELEMENT,
  timestamp: number,
) {
  const name = bookboardelementreadname(book, object)
  if (name !== 'player' && ispresent(object)) {
    // mark for cleanup
    object.removed = timestamp
    return true
  }
  return false
}

export function bookboardobjectnamedlookupdelete(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  object: MAYBE_BOARD_ELEMENT,
) {
  if (ispresent(book) && ispresent(board) && ispresent(object?.id)) {
    // remove from lookup
    if (ispresent(board.lookup) && ispresent(object.x) && ispresent(object.y)) {
      const index = object.x + object.y * board.width
      if (board.lookup[index] === object.id) {
        delete board.lookup[index]
      }
    }
    // remove from named
    const name = bookboardelementreadname(book, object)
    if (ispresent(board.named?.[name]) && ispresent(object.id)) {
      board.named[name].delete(object.id)
    }
  }
}

function bookboardcleanup(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  timestamp: number,
) {
  if (!ispresent(book) || !ispresent(board)) {
    return
  }
  // iterate through objects
  const targets = Object.values(board.objects)
  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]
    // check that we have an id and are marked for removal
    // 5 seconds after marked for removal
    if (
      ispresent(target.id) &&
      ispresent(target.removed) &&
      timestamp - target.removed > TICK_FPS * 5
    ) {
      // drop from board
      boarddeleteobject(board, target.id)
    }
  }
}

type BOOK_RUN_CODE_TARGETS = {
  object: MAYBE_BOARD_ELEMENT
  terrain: MAYBE_BOARD_ELEMENT
}

type BOOK_RUN_CODE = {
  id: string
  code: string
  type: CODE_PAGE_TYPE
}

export type BOOK_RUN_ARGS = BOOK_RUN_CODE_TARGETS & BOOK_RUN_CODE

export function bookboardtick(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  timestamp: number,
) {
  const args: BOOK_RUN_ARGS[] = []

  if (!ispresent(book) || !ispresent(board)) {
    return args
  }

  // force build object lookup pre-tick
  board.lookup = undefined
  bookboardsetlookup(book, board)

  // iterate through objects
  const objects = Object.values(board.objects)
  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]

    // check that we have an id
    if (!ispresent(object.id)) {
      continue
    }

    // track last position
    object.lx = object.x
    object.ly = object.y

    // lookup kind
    const kind = bookelementkindread(book, object)

    // object code
    const code = object.code ?? kind?.code ?? ''

    // check that we have code to execute
    if (!code) {
      continue
    }

    // signal id & code
    args.push({
      id: object.id,
      type: CODE_PAGE_TYPE.OBJECT,
      code,
      object,
      terrain: undefined,
    })
  }

  // cleanup objects flagged for deletion
  bookboardcleanup(book, board, timestamp)

  // return code that needs to be run
  return args
}
