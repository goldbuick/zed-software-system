import { WORD_VALUE } from 'zss/chip'
import { isdefined } from 'zss/mapping/types'

import { MAYBE_BOARD_ELEMENT } from './board'
import {
  CODE_PAGE,
  CONTENT_TYPE,
  CONTENT_TYPE_MAP,
  readentry,
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

function bookreadpage(book: BOOK, pagename: string): CODE_PAGE | undefined {
  const lpagename = pagename.toLowerCase()
  return book.pages.find(
    (item) => item.id === pagename || item.name.toLowerCase() === lpagename,
  )
}

export function bookreadaddress<T extends CONTENT_TYPE>(
  book: BOOK,
  type: T,
  address: string,
): CONTENT_TYPE_MAP[T] | undefined {
  const [pagename, entryname] = address.split(':')
  const page = bookreadpage(book, pagename)
  return page ? readentry(page, type, entryname) : undefined
}

export function bookobjectreadkind(
  book: BOOK,
  object: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (isdefined(object) && isdefined(object.kind)) {
    if (!isdefined(object.kinddata)) {
      object.kinddata = bookreadaddress(book, CONTENT_TYPE.OBJECT, object.kind)
    }
    return object.kinddata
  }
  return undefined
}

export function bookterrainreadkind(
  book: BOOK,
  terrain: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (isdefined(terrain) && isdefined(terrain.kind)) {
    if (!isdefined(terrain.kinddata)) {
      terrain.kinddata = bookreadaddress(
        book,
        CONTENT_TYPE.TERRAIN,
        terrain.kind,
      )
    }
    return terrain.kinddata
  }
  return undefined
}

export function bookreadboard(book: BOOK, board: string) {
  return bookreadaddress(book, CONTENT_TYPE.BOARD, board)
}

export function bookreadflags(book: BOOK, player: string) {
  if (!book.flags[player]) {
    book.flags[player] = {}
  }
  return book.flags[player]
}

export function bookreadflag(book: BOOK, player: string, name: string) {
  const flags = bookreadflags(book, player)
  return flags[name]
}

export function booksetflag(
  book: BOOK,
  player: string,
  name: string,
  value: WORD_VALUE,
) {
  const flags = bookreadflags(book, player)
  flags[name] = value
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
