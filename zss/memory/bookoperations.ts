import { FORMAT_OBJECT, formatobject, unformatobject } from 'zss/feature/format'
import { createnameid, createshortnameid, createsid } from 'zss/mapping/guid'
import { randominteger } from 'zss/mapping/number'
import { MAYBE, deepcopy, ispresent } from 'zss/mapping/types'
import { COLOR, NAME, WORD } from 'zss/words/types'

import {
  memorycodepageexport,
  memorycodepageimport,
  memorycodepagereaddata,
  memorycodepagereadname,
  memorycodepagereadstats,
  memorycodepagereadtype,
  memorycodepagetypetostring,
  memorycreatecodepage,
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

// player state

export function memorybookboardelementreadcodepage(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
): MAYBE<CODE_PAGE> {
  // figure out stats from kind codepage
  if (ispresent(element)) {
    // check for terrain element
    const terrainpage = memorybookreadcodepagewithtype(
      book,
      CODE_PAGE_TYPE.TERRAIN,
      element.kind ?? '',
    )
    if (ispresent(terrainpage)) {
      return terrainpage
    }
    // check for object element
    const objectpage = memorybookreadcodepagewithtype(
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

export function memorybookclearcodepage(book: MAYBE<BOOK>, address: string) {
  const codepage = memorybookreadcodepagebyaddress(book, address)
  if (ispresent(book) && ispresent(codepage)) {
    const laddress = NAME(address)
    book.pages = book.pages.filter(
      (item) =>
        item.id !== address && laddress !== memorycodepagereadname(item),
    )
    memorybookupdatetoken(book)
    return codepage
  }
}

export function memorybookclearflags(book: MAYBE<BOOK>, id: string) {
  if (!book) {
    return
  }
  delete book.flags[id]
}

export function memorybookelementdisplayread(
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

export function memorybookensurecodepagewithtype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  address: string,
): [MAYBE<CODE_PAGE>, boolean] {
  let codepage = memorybookreadcodepagewithtype(book, type, address)
  if (!ispresent(codepage)) {
    // create new codepage
    const typestr = memorycodepagetypetostring(type)
    codepage = memorycreatecodepage(
      typestr === 'object'
        ? `@${address || 'object'}\n`
        : `@${typestr} ${address}\n`,
      {},
    )
    memorybookwritecodepage(book, codepage)
    return [codepage, true]
  }
  return [codepage, false]
}

export function memorybookexport(book: MAYBE<BOOK>): MAYBE<FORMAT_OBJECT> {
  return formatobject(book, BOOK_KEYS, {
    pages: (pages) => pages.map(memorycodepageexport),
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

export function memorybookhasflags(book: MAYBE<BOOK>, id: string) {
  return !!book?.flags[id]
}

export function memorybookhasmatch(book: MAYBE<BOOK>, ids: string[]): boolean {
  if (!ispresent(book)) {
    return false
  }
  if (ids.some((id) => id === book.id)) {
    return true
  }
  return false
}

export function memorybookimport(bookentry: MAYBE<FORMAT_OBJECT>): MAYBE<BOOK> {
  const book: MAYBE<BOOK> = unformatobject(bookentry, BOOK_KEYS, {
    pages: (pages) => pages.map(memorycodepageimport),
  })
  if (ispresent(book)) {
    // remove old data
    delete book.flags.gadgetsync
  }
  return book
}

export function memorybookreadboard(
  book: MAYBE<BOOK>,
  address: string,
): MAYBE<BOARD> {
  const codepage = memorybookreadcodepagebyaddress(book, address)
  return memorycodepagereaddata<CODE_PAGE_TYPE.BOARD>(codepage)
}

export function memorybookreadcodepagebyaddress(
  book: MAYBE<BOOK>,
  address: string,
): MAYBE<CODE_PAGE> {
  if (!ispresent(book)) {
    return undefined
  }

  const laddress = NAME(address)
  const codepage = book.pages.find(
    (item) => item.id === address || laddress === memorycodepagereadname(item),
  )

  return codepage
}

export function memorybookreadcodepagedatabytype<T extends CODE_PAGE_TYPE>(
  book: MAYBE<BOOK>,
  type: T,
): CODE_PAGE_TYPE_MAP[T][] {
  if (!ispresent(book)) {
    return []
  }
  return book.pages
    .filter((item) => memorycodepagereadtype(item) === type)
    .map((page) => memorycodepagereaddata(page))
    .filter(ispresent) as CODE_PAGE_TYPE_MAP[T][]
}

export function memorybookreadcodepagesbystat(
  book: MAYBE<BOOK>,
  statname: string,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  const maybename = NAME(statname)
  const result = book.pages.filter((codepage) => {
    const stats = memorycodepagereadstats(codepage)
    const codepagename = NAME(memorycodepagereadname(codepage))
    return (
      codepage.id === statname ||
      maybename === codepagename ||
      ispresent(stats[statname])
    )
  })
  return result
}

export function memorybookreadcodepagesbytype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  return book.pages.filter((item) => memorycodepagereadtype(item) === type)
}

export function memorybookreadcodepagesbytypeandstat(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  statname: string,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  const maybename = NAME(statname)
  const result = book.pages
    .filter((item) => memorycodepagereadtype(item) === type)
    .filter((codepage) => {
      const stats = memorycodepagereadstats(codepage)
      const codepagename = NAME(memorycodepagereadname(codepage))
      return (
        codepage.id === statname ||
        maybename === codepagename ||
        ispresent(stats[statname])
      )
    })
  return result
}

export function memorybookreadcodepagewithtype(
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
      memorycodepagereadtype(item) === type &&
      (item.id === address || laddress === memorycodepagereadname(item)),
  )

  return codepage
}

export function memorybookreadflag(
  book: MAYBE<BOOK>,
  id: string,
  name: string,
) {
  const flags = memorybookreadflags(book, id)
  return flags?.[name]
}

export function memorybookreadflags(book: MAYBE<BOOK>, id: string) {
  if (!book) {
    return {}
  }
  book.flags[id] = book.flags[id] ?? {}
  return book.flags[id]
}

export function memorybookreadsortedcodepages(book: MAYBE<BOOK>) {
  if (!ispresent(book)) {
    return []
  }
  const sorted = deepcopy(book.pages).sort((a, b) => {
    const atype = memorycodepagereadtype(a)
    const btype = memorycodepagereadtype(b)
    if (atype === btype) {
      return memorycodepagereadname(a).localeCompare(memorycodepagereadname(b))
    }
    return btype - atype
  })
  return sorted
}

export function memorybookupdatename(book: MAYBE<BOOK>) {
  if (ispresent(book)) {
    book.name = createnameid()
  }
}

export function memorybookupdatetoken(book: MAYBE<BOOK>) {
  if (ispresent(book)) {
    book.token = `${createshortnameid()}${randominteger(1111, 9999)}`
  }
}

export function memorybookwritecodepage(
  book: MAYBE<BOOK>,
  codepage: MAYBE<CODE_PAGE>,
): boolean {
  if (!ispresent(book) || !ispresent(codepage)) {
    return false
  }

  const existing = memorybookreadcodepagebyaddress(book, codepage.id)
  if (ispresent(existing)) {
    return false
  }

  book.pages.push(codepage)
  memorybookupdatetoken(book)

  return true
}

export function memorybookwriteflag(
  book: MAYBE<BOOK>,
  id: string,
  name: string,
  value: WORD,
) {
  const flags = memorybookreadflags(book, id)
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
