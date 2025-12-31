import { FORMAT_OBJECT, formatobject, unformatobject } from 'zss/feature/format'
import { createnameid, createshortnameid, createsid } from 'zss/mapping/guid'
import { randominteger } from 'zss/mapping/number'
import { MAYBE, deepcopy, ispresent } from 'zss/mapping/types'
import { COLOR, NAME, WORD } from 'zss/words/types'

import {
  memorycodepagetypetostring,
  memorycreatecodepage,
  memoryexportcodepage,
  memoryimportcodepage,
  memoryreadcodepagedata,
  memoryreadcodepagename,
  memoryreadcodepagestats,
  memoryreadcodepagetype,
} from './codepageoperations'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  BOOK_FLAGS,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  CODE_PAGE_TYPE_MAP,
} from './types'

export function memoryreadelementcodepage(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
): MAYBE<CODE_PAGE> {
  // figure out stats from kind codepage
  if (ispresent(element)) {
    // check for terrain element
    const terrainpage = memoryreadbookcodepagewithtype(
      book,
      CODE_PAGE_TYPE.TERRAIN,
      element.kind ?? '',
    )
    if (ispresent(terrainpage)) {
      return terrainpage
    }
    // check for object element
    const objectpage = memoryreadbookcodepagewithtype(
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

export function memoryclearbookcodepage(book: MAYBE<BOOK>, address: string) {
  const codepage = memoryreadbookcodepagebyaddress(book, address)
  if (ispresent(book) && ispresent(codepage)) {
    const laddress = NAME(address)
    book.pages = book.pages.filter(
      (item) =>
        item.id !== address && laddress !== memoryreadcodepagename(item),
    )
    memoryupdatebooktoken(book)
    return codepage
  }
}

export function memoryclearbookflags(book: MAYBE<BOOK>, id: string) {
  if (!book) {
    return
  }
  delete book.flags[id]
}

export function memoryreadelementdisplay(
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

export function memoryensurebookcodepagewithtype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  address: string,
): [MAYBE<CODE_PAGE>, boolean] {
  let codepage = memoryreadbookcodepagewithtype(book, type, address)
  if (!ispresent(codepage)) {
    // create new codepage
    const typestr = memorycodepagetypetostring(type)
    codepage = memorycreatecodepage(
      typestr === 'object'
        ? `@${address || 'object'}\n`
        : `@${typestr} ${address}\n`,
      {},
    )
    memorywritebookcodepage(book, codepage)
    return [codepage, true]
  }
  return [codepage, false]
}

export function memoryexportbook(book: MAYBE<BOOK>): MAYBE<FORMAT_OBJECT> {
  return formatobject(book, BOOK_KEYS, {
    pages: (pages) => pages.map(memoryexportcodepage),
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

export function memoryhasbookflags(book: MAYBE<BOOK>, id: string) {
  return !!book?.flags[id]
}

export function memoryhasbookmatch(book: MAYBE<BOOK>, ids: string[]): boolean {
  if (!ispresent(book)) {
    return false
  }
  if (ids.some((id) => id === book.id)) {
    return true
  }
  return false
}

export function memoryimportbook(bookentry: MAYBE<FORMAT_OBJECT>): MAYBE<BOOK> {
  const book: MAYBE<BOOK> = unformatobject(bookentry, BOOK_KEYS, {
    pages: (pages) => pages.map(memoryimportcodepage),
  })
  if (ispresent(book)) {
    // remove old data
    delete book.flags.gadgetsync
  }
  return book
}

export function memoryreadbookboard(
  book: MAYBE<BOOK>,
  address: string,
): MAYBE<BOARD> {
  const codepage = memoryreadbookcodepagebyaddress(book, address)
  return memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(codepage)
}

export function memoryreadbookcodepagebyaddress(
  book: MAYBE<BOOK>,
  address: string,
): MAYBE<CODE_PAGE> {
  if (!ispresent(book)) {
    return undefined
  }

  const laddress = NAME(address)
  const codepage = book.pages.find(
    (item) => item.id === address || laddress === memoryreadcodepagename(item),
  )

  return codepage
}

export function memoryreadbookcodepagedatabytype<T extends CODE_PAGE_TYPE>(
  book: MAYBE<BOOK>,
  type: T,
): CODE_PAGE_TYPE_MAP[T][] {
  if (!ispresent(book)) {
    return []
  }
  return book.pages
    .filter((item) => memoryreadcodepagetype(item) === type)
    .map((page) => memoryreadcodepagedata(page))
    .filter(ispresent) as CODE_PAGE_TYPE_MAP[T][]
}

export function memoryreadbookcodepagesbystat(
  book: MAYBE<BOOK>,
  statname: string,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  const maybename = NAME(statname)
  const result = book.pages.filter((codepage) => {
    const stats = memoryreadcodepagestats(codepage)
    const codepagename = NAME(memoryreadcodepagename(codepage))
    return (
      codepage.id === statname ||
      maybename === codepagename ||
      ispresent(stats[statname])
    )
  })
  return result
}

export function memoryreadbookcodepagesbytype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  return book.pages.filter((item) => memoryreadcodepagetype(item) === type)
}

export function memoryreadbookcodepagesbytypeandstat(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  statname: string,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  const maybename = NAME(statname)
  const result = book.pages
    .filter((item) => memoryreadcodepagetype(item) === type)
    .filter((codepage) => {
      const stats = memoryreadcodepagestats(codepage)
      const codepagename = NAME(memoryreadcodepagename(codepage))
      return (
        codepage.id === statname ||
        maybename === codepagename ||
        ispresent(stats[statname])
      )
    })
  return result
}

export function memoryreadbookcodepagewithtype(
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
      memoryreadcodepagetype(item) === type &&
      (item.id === address || laddress === memoryreadcodepagename(item)),
  )

  return codepage
}

export function memoryreadbookflag(
  book: MAYBE<BOOK>,
  id: string,
  name: string,
) {
  const flags = memoryreadbookflags(book, id)
  return flags?.[name]
}

export function memoryreadbookflags(book: MAYBE<BOOK>, id: string) {
  if (!book) {
    return {}
  }
  book.flags[id] = book.flags[id] ?? {}
  return book.flags[id]
}

export function memoryreadbookcodepagessorted(book: MAYBE<BOOK>) {
  if (!ispresent(book)) {
    return []
  }
  const sorted = deepcopy(book.pages).sort((a, b) => {
    const atype = memoryreadcodepagetype(a)
    const btype = memoryreadcodepagetype(b)
    if (atype === btype) {
      return memoryreadcodepagename(a).localeCompare(memoryreadcodepagename(b))
    }
    return btype - atype
  })
  return sorted
}

export function memoryupdatebookname(book: MAYBE<BOOK>) {
  if (ispresent(book)) {
    book.name = createnameid()
  }
}

export function memoryupdatebooktoken(book: MAYBE<BOOK>) {
  if (ispresent(book)) {
    book.token = `${createshortnameid()}${randominteger(1111, 9999)}`
  }
}

export function memorywritebookcodepage(
  book: MAYBE<BOOK>,
  codepage: MAYBE<CODE_PAGE>,
): boolean {
  if (!ispresent(book) || !ispresent(codepage)) {
    return false
  }

  const existing = memoryreadbookcodepagebyaddress(book, codepage.id)
  if (ispresent(existing)) {
    return false
  }

  book.pages.push(codepage)
  memoryupdatebooktoken(book)

  return true
}

export function memorywritebookflag(
  book: MAYBE<BOOK>,
  id: string,
  name: string,
  value: WORD,
) {
  const flags = memoryreadbookflags(book, id)
  if (flags) {
    flags[name] = value
  }
  return value
}

export function memorycreatebook(pages: CODE_PAGE[]): BOOK {
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
