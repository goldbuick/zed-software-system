import { isDefined } from 'ts-extras'

import { MAYBE_BOARD_ELEMENT } from './board'
import {
  CODE_PAGE,
  CONTENT_TYPE,
  CONTENT_TYPE_MAP,
  readentry,
} from './codepage'

export type BOOK = {
  id: string
  name: string
  pages: CODE_PAGE[]
}

function readpage(book: BOOK, pagename: string): CODE_PAGE | undefined {
  const lpagename = pagename.toLowerCase()
  return book.pages.find(
    (item) => item.id === pagename || item.name.toLowerCase() === lpagename,
  )
}

export function readaddress<T extends CONTENT_TYPE>(
  book: BOOK,
  type: T,
  address: string,
): CONTENT_TYPE_MAP[T] | undefined {
  const [pagename, entryname] = address.split(':')
  const page = readpage(book, pagename)
  return page ? readentry(page, type, entryname) : undefined
}

export function bookobjectreadkind(
  book: BOOK,
  object: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (isDefined(object) && isDefined(object.kind)) {
    if (!isDefined(object.kinddata)) {
      object.kinddata = readaddress(book, CONTENT_TYPE.OBJECT, object.kind)
    }
    return object.kinddata
  }
  return undefined
}

export function bookterrainreadkind(
  book: BOOK,
  terrain: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (isDefined(terrain) && isDefined(terrain.kind)) {
    if (!isDefined(terrain.kinddata)) {
      terrain.kinddata = readaddress(book, CONTENT_TYPE.TERRAIN, terrain.kind)
    }
    return terrain.kinddata
  }
  return undefined
}
