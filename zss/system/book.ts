import { CODE_PAGE, CONTENT_TYPE, readentry } from './codepage'

export type BOOK_FLAG_VALUE = string | number

export type BOOK_FLAG = {
  id: string
  name: string
  value: BOOK_FLAG_VALUE | BOOK_FLAG_VALUE[]
}

export type BOOK = {
  id: string
  name: string
  pages: CODE_PAGE[]
  flags: BOOK_FLAG[]
}

export function readflags(
  book: BOOK,
  name: string,
): BOOK_FLAG_VALUE | BOOK_FLAG_VALUE[] | undefined {
  const lname = name.toLowerCase()
  const [flags] = book.flags.filter((item) => item.name.toLowerCase() === lname)
  return flags?.value
}

export function readaddress(address: string) {
  const [entryname, pagename = 'app'] = address.split(':').toReversed()
  return [pagename, entryname]
}

function readpage(book: BOOK, pagename: string): CODE_PAGE | undefined {
  const lpagename = pagename.toLowerCase()
  return book.pages.find((item) => item.name.toLowerCase() === lpagename)
}

export function readcode(book: BOOK, pagename: string, entryname: string) {
  const page = readpage(book, pagename)
  return page ? readentry(page, CONTENT_TYPE.CODE, entryname) : undefined
}

export function readboard(book: BOOK, pagename: string, entryname: string) {
  const page = readpage(book, pagename)
  return page ? readentry(page, CONTENT_TYPE.BOARD, entryname) : undefined
}
