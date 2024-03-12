import { WORD_VALUE } from 'zss/chip'
import { unique } from 'zss/mapping/array'
import { createguid } from 'zss/mapping/guid'
import { MAYBE, MAYBE_STRING, isdefined } from 'zss/mapping/types'

import { MAYBE_BOARD, MAYBE_BOARD_ELEMENT } from './board'
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
  if (!book) {
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
  return bookreadcodepage(book, CODE_PAGE_TYPE.OBJECT, object ?? '')
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
  return bookreadcodepage(book, CODE_PAGE_TYPE.TERRAIN, terrain ?? '')
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
