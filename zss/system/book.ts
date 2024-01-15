import { CODE_PAGE, CONTENT_TYPE, readentry } from './codepage'

export type BOOK_CONFIG_VALUE = string | number

export type BOOK_CONFIG = {
  id: string
  name: string
  value: BOOK_CONFIG_VALUE | BOOK_CONFIG_VALUE[]
}

export type BOOK = {
  id: string
  name: string
  pages: CODE_PAGE[]
  config: BOOK_CONFIG[]
}

export function readconfig(
  book: BOOK,
  name: string,
): BOOK_CONFIG_VALUE | BOOK_CONFIG_VALUE[] | undefined {
  const lname = name.toLowerCase()
  const [config] = book.config.filter(
    (item) => item.name.toLowerCase() === lname,
  )
  return config?.value
}

export function readpage(book: BOOK, name: string): CODE_PAGE | undefined {
  const lname = name.toLowerCase()
  return book.pages.find((item) => item.name.toLowerCase() === lname)
}

export function readcode(book: BOOK, pagename: string, entryname: string) {
  const page = readpage(book, pagename)
  if (!page) {
    return undefined
  }

  return readentry(page, CONTENT_TYPE.CODE, entryname)
}
