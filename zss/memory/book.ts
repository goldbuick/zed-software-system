import { FORMAT_OBJECT, formatobject, unformatobject } from 'zss/feature/format'
import { createnameid, createshortnameid, createsid } from 'zss/mapping/guid'
import { randominteger } from 'zss/mapping/number'
import { MAYBE, deepcopy, ispresent } from 'zss/mapping/types'
import { COLOR, NAME, WORD } from 'zss/words/types'

import {
  codepagereaddata,
  codepagereadname,
  codepagereadstats,
  codepagereadtype,
  codepagetypetostring,
  createcodepage,
  exportcodepage,
  importcodepage,
} from './codepage'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  BOOK_FLAGS,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  CODE_PAGE_TYPE_MAP,
} from './types'

// player state

export function createbook(pages: CODE_PAGE[]): BOOK {
  return {
    id: createsid(),
    name: createnameid(),
    timestamp: 0,
    activelist: [],
    pages,
    flags: {},
  }
}

enum BOOK_KEYS {
  id,
  name,
  timestamp,
  activelist,
  pages,
  flags,
  token,
}

export function exportbook(book: MAYBE<BOOK>): MAYBE<FORMAT_OBJECT> {
  return formatobject(book, BOOK_KEYS, {
    pages: (pages) => pages.map(exportcodepage),
    flags: (flags: Record<string, BOOK_FLAGS>) => {
      const ids = Object.keys(flags)
      for (let i = 0; i < ids.length; ++i) {
        // drop empty flag entries
        const id = ids[i]
        if (Object.keys(flags[id]).length === 0) {
          delete flags[id]
        }
      }
      return flags
    },
  })
}

export function importbook(bookentry: MAYBE<FORMAT_OBJECT>): MAYBE<BOOK> {
  const book: MAYBE<BOOK> = unformatobject(bookentry, BOOK_KEYS, {
    pages: (pages) => pages.map(importcodepage),
  })
  if (ispresent(book)) {
    // remove old data
    delete book.flags.gadgetsync
  }
  return book
}

// gadgetsync
export function bookupdatetoken(book: MAYBE<BOOK>) {
  if (ispresent(book)) {
    book.token = `${createshortnameid()}${randominteger(1111, 9999)}`
  }
}

export function bookhasmatch(book: MAYBE<BOOK>, ids: string[]): boolean {
  if (!ispresent(book)) {
    return false
  }
  if (ids.some((id) => id === book.id)) {
    return true
  }
  return false
}

export function bookreadcodepagebyaddress(
  book: MAYBE<BOOK>,
  address: string,
): MAYBE<CODE_PAGE> {
  if (!ispresent(book)) {
    return undefined
  }

  const laddress = NAME(address)
  const codepage = book.pages.find(
    (item) => item.id === address || laddress === codepagereadname(item),
  )

  return codepage
}

export function bookreadcodepagewithtype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  address: string,
): MAYBE<CODE_PAGE> {
  if (!ispresent(book)) {
    return undefined
  }

  const laddress = NAME(address)
  const codepage = book.pages.find(
    (item) =>
      codepagereadtype(item) === type &&
      (item.id === address || laddress === codepagereadname(item)),
  )

  return codepage
}

export function bookensurecodepagewithtype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  address: string,
): [MAYBE<CODE_PAGE>, boolean] {
  let codepage = bookreadcodepagewithtype(book, type, address)
  if (!ispresent(codepage)) {
    // create new codepage
    const typestr = codepagetypetostring(type)
    codepage = createcodepage(
      typestr === 'object'
        ? `@${address || 'object'}\n`
        : `@${typestr} ${address}\n`,
      {},
    )
    bookwritecodepage(book, codepage)
    return [codepage, true]
  }
  return [codepage, false]
}

export function bookreadcodepagesbytype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  return book.pages.filter((item) => codepagereadtype(item) === type)
}

export function bookreadcodepagesbytypeandstat(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  statname: string,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  const maybename = NAME(statname)
  const result = book.pages
    .filter((item) => codepagereadtype(item) === type)
    .filter((codepage) => {
      const stats = codepagereadstats(codepage)
      const codepagename = NAME(codepagereadname(codepage))
      return (
        codepage.id === statname ||
        maybename === codepagename ||
        ispresent(stats[statname])
      )
    })
  return result
}

export function bookreadcodepagedatabytype<T extends CODE_PAGE_TYPE>(
  book: MAYBE<BOOK>,
  type: T,
): CODE_PAGE_TYPE_MAP[T][] {
  if (!ispresent(book)) {
    return []
  }
  return book.pages
    .filter((item) => codepagereadtype(item) === type)
    .map((page) => codepagereaddata(page))
    .filter(ispresent) as CODE_PAGE_TYPE_MAP[T][]
}

export function bookreadsortedcodepages(book: MAYBE<BOOK>) {
  if (!ispresent(book)) {
    return []
  }
  const sorted = deepcopy(book.pages).sort((a, b) => {
    const atype = codepagereadtype(a)
    const btype = codepagereadtype(b)
    if (atype === btype) {
      return codepagereadname(a).localeCompare(codepagereadname(b))
    }
    return btype - atype
  })
  return sorted
}

export function bookboardelementreadcodepage(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
): MAYBE<CODE_PAGE> {
  // figure out stats from kind codepage
  if (ispresent(element)) {
    // check for terrain element
    const terrainpage = bookreadcodepagewithtype(
      book,
      CODE_PAGE_TYPE.TERRAIN,
      element.kind ?? '',
    )
    if (ispresent(terrainpage)) {
      return terrainpage
    }
    // check for object element
    const objectpage = bookreadcodepagewithtype(
      book,
      CODE_PAGE_TYPE.OBJECT,
      element.kind ?? '',
    )
    if (ispresent(objectpage)) {
      return objectpage
    }
  }
  return undefined
}

export function bookwritecodepage(
  book: MAYBE<BOOK>,
  codepage: MAYBE<CODE_PAGE>,
): boolean {
  if (!ispresent(book) || !ispresent(codepage)) {
    return false
  }

  const existing = bookreadcodepagebyaddress(book, codepage.id)
  if (ispresent(existing)) {
    return false
  }

  book.pages.push(codepage)
  bookupdatetoken(book)

  return true
}

export function bookclearcodepage(book: MAYBE<BOOK>, address: string) {
  const codepage = bookreadcodepagebyaddress(book, address)
  if (ispresent(book) && ispresent(codepage)) {
    const laddress = NAME(address)
    book.pages = book.pages.filter(
      (item) => item.id !== address && laddress !== codepagereadname(item),
    )
    bookupdatetoken(book)
    return codepage
  }
}

export function bookelementdisplayread(
  element: MAYBE<BOARD_ELEMENT>,
  defaultchar = 1,
  defaultcolor = COLOR.WHITE,
  defaultbg = COLOR.BLACK,
): { name: string; char: number; color: COLOR; bg: COLOR; light: number } {
  const kind = element?.kinddata
  return {
    name: NAME(element?.name ?? kind?.name),
    char:
      element?.displaychar ??
      kind?.displaychar ??
      element?.char ??
      kind?.char ??
      defaultchar,
    color:
      element?.displaycolor ??
      kind?.displaycolor ??
      element?.color ??
      kind?.color ??
      defaultcolor,
    bg:
      element?.displaybg ??
      kind?.displaybg ??
      element?.bg ??
      kind?.bg ??
      defaultbg,
    light: element?.light ?? kind?.light ?? 0,
  }
}

export function bookreadboard(
  book: MAYBE<BOOK>,
  address: string,
): MAYBE<BOARD> {
  const codepage = bookreadcodepagebyaddress(book, address)
  return codepagereaddata<CODE_PAGE_TYPE.BOARD>(codepage)
}

export function bookhasflags(book: MAYBE<BOOK>, id: string) {
  return !!book?.flags[id]
}

export function bookreadflags(book: MAYBE<BOOK>, id: string) {
  if (!book) {
    return {}
  }
  book.flags[id] = book.flags[id] ?? {}
  return book.flags[id]
}

export function bookclearflags(book: MAYBE<BOOK>, id: string) {
  if (!book) {
    return
  }
  delete book.flags[id]
}

export function bookreadflag(book: MAYBE<BOOK>, id: string, name: string) {
  const flags = bookreadflags(book, id)
  return flags?.[name]
}

export function bookwriteflag(
  book: MAYBE<BOOK>,
  id: string,
  name: string,
  value: WORD,
) {
  const flags = bookreadflags(book, id)
  if (flags) {
    flags[name] = value
  }
  return value
}
