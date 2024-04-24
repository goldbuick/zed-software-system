import { WORD_VALUE } from 'zss/chip'
import { PT, COLLISION, CATEGORY } from 'zss/firmware/wordtypes'
import { unique } from 'zss/mapping/array'
import { createguid } from 'zss/mapping/guid'
import { MAYBE, MAYBE_STRING, isdefined, ispresent } from 'zss/mapping/types'

import { checkcollision } from './atomics'
import {
  BOARD,
  BOARD_ELEMENT,
  MAYBE_BOARD,
  MAYBE_BOARD_ELEMENT,
  boardreadobject,
} from './board'
import {
  CODE_PAGE,
  CODE_PAGE_TYPE,
  CODE_PAGE_TYPE_MAP,
  MAYBE_CODE_PAGE,
  codepagereadname,
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

export function createbook(name: string, pages: CODE_PAGE[]): BOOK {
  return {
    id: createguid(),
    name,
    pages,
    flags: {},
    players: {},
  }
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

export function bookreadcodepagedata<T extends CODE_PAGE_TYPE>(
  book: MAYBE_BOOK,
  type: T,
  address: string,
): MAYBE<CODE_PAGE_TYPE_MAP[T]> {
  const codepage = bookreadcodepage(book, type, address)

  if (codepage) {
    switch (type) {
      case CODE_PAGE_TYPE.ERROR:
        return codepage.error as MAYBE<CODE_PAGE_TYPE_MAP[T]>
      case CODE_PAGE_TYPE.FUNC:
        return codepage.code as MAYBE<CODE_PAGE_TYPE_MAP[T]>
      case CODE_PAGE_TYPE.BOARD:
        return codepage.board as MAYBE<CODE_PAGE_TYPE_MAP[T]>
      case CODE_PAGE_TYPE.OBJECT:
        return codepage.object as MAYBE<CODE_PAGE_TYPE_MAP[T]>
      case CODE_PAGE_TYPE.TERRAIN:
        return codepage.terrain as MAYBE<CODE_PAGE_TYPE_MAP[T]>
      case CODE_PAGE_TYPE.CHARSET:
        return codepage.charset as MAYBE<CODE_PAGE_TYPE_MAP[T]>
      case CODE_PAGE_TYPE.PALETTE:
        return codepage.palette as MAYBE<CODE_PAGE_TYPE_MAP[T]>
    }
  }

  return undefined
}

export function bookreadobject(
  book: MAYBE_BOOK,
  object: MAYBE_STRING,
): MAYBE_BOARD_ELEMENT {
  const withobject = object ?? ''
  const page = bookreadcodepage(book, CODE_PAGE_TYPE.OBJECT, withobject)
  const data = bookreadcodepagedata(book, CODE_PAGE_TYPE.OBJECT, withobject)
  return !ispresent(page)
    ? undefined
    : {
        ...data,
        name: withobject,
        code: page.code,
      }
}

export function bookobjectreadkind(
  book: MAYBE_BOOK,
  object: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (isdefined(object) && isdefined(object.kind)) {
    if (!isdefined(object.kinddata)) {
      object.kinddata = bookreadobject(book, object.kind)
    }
    return object.kinddata
  }
  return undefined
}

export function bookreadterrain(
  book: MAYBE_BOOK,
  terrain: MAYBE_STRING,
): MAYBE_BOARD_ELEMENT {
  const withterrain = terrain ?? ''
  const page = bookreadcodepage(book, CODE_PAGE_TYPE.TERRAIN, withterrain)
  const data = bookreadcodepagedata(book, CODE_PAGE_TYPE.TERRAIN, withterrain)
  return !ispresent(page)
    ? undefined
    : {
        ...data,
        name: withterrain,
        code: page.code,
      }
}

export function bookterrainreadkind(
  book: MAYBE_BOOK,
  terrain: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (isdefined(terrain) && isdefined(terrain.kind)) {
    if (!isdefined(terrain.kinddata)) {
      terrain.kinddata = bookreadterrain(book, terrain.kind)
    }
    return terrain.kinddata
  }
  return undefined
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
  if (isdefined(book) && isdefined(bookreadboard(book, board))) {
    book.players[player] = board
  }
}

export function bookplayerreadboards(book: MAYBE_BOOK) {
  return unique(Object.values(book?.players ?? []))
    .map((address) => bookreadboard(book, address))
    .filter(isdefined)
}

export function bookboardmoveobject(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
  dest: PT,
): MAYBE_BOARD_ELEMENT {
  const object = boardreadobject(board, target?.id ?? '')
  // first pass clipping
  if (
    !isdefined(book) ||
    !isdefined(board) ||
    !isdefined(object) ||
    !isdefined(board.lookup) ||
    dest.x < 0 ||
    dest.x >= board.width ||
    dest.y < 0 ||
    dest.y >= board.height
  ) {
    // for sending interaction messages
    return { kind: 'edge', ...dest }
  }

  const idx = dest.x + dest.y * board.width
  const targetkind = bookobjectreadkind(book, object)
  const targetcollision =
    object.collision ?? targetkind?.collision ?? COLLISION.WALK

  // blocked by an object
  const maybeobject = boardreadobject(board, board.lookup[idx] ?? '')
  if (isdefined(maybeobject)) {
    // for sending interaction messages
    return { ...maybeobject }
  }

  // blocked by terrain
  const mayberterrain = board.terrain[idx]
  if (isdefined(mayberterrain)) {
    const terrainkind = bookterrainreadkind(book, mayberterrain)
    const terraincollision =
      mayberterrain.collision ?? terrainkind?.collision ?? COLLISION.WALK
    if (checkcollision(targetcollision, terraincollision)) {
      // for sending interaction messages
      // does this break out from proxy object land ?
      return { ...(mayberterrain as BOARD_ELEMENT), ...dest }
    }
  }

  // todo - everything else ...
  // now I don't know what everything else was ...
  board.lookup[idx] = undefined

  // update object location
  object.x = dest.x
  object.y = dest.y

  // update lookup
  board.lookup[object.x + object.y * board.width] = object.id ?? ''

  // no interaction
  return undefined
}

function boardsetlookup(book: BOOK, board: BOARD) {
  const lookup: string[] = new Array(board.width * board.height).fill(undefined)
  const named: Record<string, Set<string | number>> = {}

  // add objects to lookup & to named
  const objects = Object.values(board.objects)
  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]
    if (isdefined(object.x) && isdefined(object.y) && isdefined(object.id)) {
      // cache kind
      const kind = bookobjectreadkind(book, object)

      // add category
      object.category = CATEGORY.OBJECT

      // update lookup
      lookup[object.x + object.y * board.width] = object.id

      // update named lookup
      const name = (object.name ?? kind?.name ?? 'object').toLowerCase()
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
    if (isdefined(terrain)) {
      // cache kind
      const kind = bookobjectreadkind(book, terrain)

      // add coords
      terrain.x = x
      terrain.y = y
      terrain.category = CATEGORY.TERRAIN

      // update named lookup
      const name = (terrain.name ?? kind?.name ?? 'terrain').toLowerCase()
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

export function bookboardtick(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  oncode: (
    book: BOOK,
    board: BOARD,
    target: BOARD_ELEMENT,
    id: string,
    code: string,
  ) => void,
) {
  if (!isdefined(book) || !isdefined(board)) {
    return
  }

  // build object lookup pre-tick
  boardsetlookup(book, board)

  // iterate through objects
  const targets = Object.values(board.objects)
  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]

    // check that we have an id
    if (!isdefined(target.id)) {
      return
    }

    // track last position
    target.lx = target.x
    target.ly = target.y

    // lookup kind
    const kind = bookobjectreadkind(book, target)

    // object code
    const code = target.code ?? kind?.code ?? ''

    // check that we have code to execute
    if (!code) {
      return
    }

    // signal id & code
    oncode(book, board, target, target.id, code)
  }

  // cleanup objects flagged for deletion
}
