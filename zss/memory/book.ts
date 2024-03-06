import { WORD_VALUE } from 'zss/chip'
import { unique } from 'zss/mapping/array'
import { createguid } from 'zss/mapping/guid'
import { MAYBE, isdefined } from 'zss/mapping/types'

import { MAYBE_BOARD_ELEMENT } from './board'
import {
  CODE_PAGE,
  CODE_PAGE_TYPE,
  CODE_PAGE_TYPE_MAP,
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

export function createbook(name: string, pages: CODE_PAGE[]) {
  return {
    id: createguid(),
    name,
    pages,
    flags: {},
    players: {},
  }
}

export function bookreadcodepage<T extends CODE_PAGE_TYPE>(
  book: MAYBE_BOOK,
  type: T,
  address: string,
): CODE_PAGE_TYPE_MAP[T] | undefined {
  if (!book) {
    return undefined
  }

  const laddress = address.toLowerCase()
  const codepage = book.pages.find(
    (item) =>
      codepagereadtype(item) === type &&
      (item.id === address || laddress === codepagereadname(item)),
  )

  if (codepage) {
    switch (type) {
      case CODE_PAGE_TYPE.ERROR:
        return codepage.error as CODE_PAGE_TYPE_MAP[T] | undefined
      case CODE_PAGE_TYPE.FUNC:
        return codepage.code as CODE_PAGE_TYPE_MAP[T] | undefined
      case CODE_PAGE_TYPE.BOARD:
        return codepage.board as CODE_PAGE_TYPE_MAP[T] | undefined
      case CODE_PAGE_TYPE.OBJECT:
        return codepage.object as CODE_PAGE_TYPE_MAP[T] | undefined
      case CODE_PAGE_TYPE.TERRAIN:
        return codepage.terrain as CODE_PAGE_TYPE_MAP[T] | undefined
      case CODE_PAGE_TYPE.CHARSET:
        return codepage.charset as CODE_PAGE_TYPE_MAP[T] | undefined
      case CODE_PAGE_TYPE.PALETTE:
        return codepage.palette as CODE_PAGE_TYPE_MAP[T] | undefined
    }
  }

  return undefined
}

export function bookobjectreadkind(
  book: MAYBE_BOOK,
  object: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (isdefined(object) && isdefined(object.kind)) {
    if (!isdefined(object.kinddata)) {
      object.kinddata = bookreadcodepage(
        book,
        CODE_PAGE_TYPE.OBJECT,
        object.kind,
      )
    }
    return object.kinddata
  }
  return undefined
}

export function bookterrainreadkind(
  book: MAYBE_BOOK,
  terrain: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (isdefined(terrain) && isdefined(terrain.kind)) {
    if (!isdefined(terrain.kinddata)) {
      terrain.kinddata = bookreadcodepage(
        book,
        CODE_PAGE_TYPE.TERRAIN,
        terrain.kind,
      )
    }
    return terrain.kinddata
  }
  return undefined
}

export function bookreadboard(book: MAYBE_BOOK, board: string) {
  return bookreadcodepage(book, CODE_PAGE_TYPE.BOARD, board)
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
  book: BOOK,
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

export function bookplayerreadboard(book: BOOK, player: string) {
  return bookreadboard(book, book.players[player] ?? '')
}

export function bookplayersetboard(book: BOOK, player: string, board: string) {
  if (isdefined(bookreadboard(book, board))) {
    book.players[player] = board
  }
}

export function bookplayerreadboards(book: BOOK) {
  return unique(Object.values(book.players))
    .map((address) => bookreadboard(book, address))
    .filter(isdefined)
}
