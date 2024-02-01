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
