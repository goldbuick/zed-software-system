import { FORMAT_OBJECT, formatobject, unformatobject } from 'zss/feature/format'
import { createnameid, createshortnameid, createsid } from 'zss/mapping/guid'
import { randominteger } from 'zss/mapping/number'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { COLOR, NAME, WORD } from 'zss/words/types'

import {
  memoryboundaryalloc,
  memoryboundarydelete,
  memoryboundaryget,
} from './boundaries'
import {
  memorycodepagetypetostring,
  memorycreatecodepage,
  memoryexportcodepage,
  memoryexportcodepageasjson,
  memoryfreecodepage,
  memoryimportcodepage,
  memoryimportcodepagefromjson,
  memoryreadcodepagedata,
  memoryreadcodepagename,
  memoryreadcodepagestats,
  memoryreadcodepagetype,
} from './codepageoperations'
import { memoryreadboardelementruntime } from './runtimeboundary'
import {
  BOARD_ELEMENT,
  BOOK,
  BOOK_FLAGS,
  BOOK_KEYS,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  CODE_PAGE_TYPE_MAP,
} from './types'

export function memoryreadelementcodepage(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
): MAYBE<CODE_PAGE> {
  if (ispresent(element)) {
    const terrainpage = memoryreadcodepagewithtype(
      book,
      CODE_PAGE_TYPE.TERRAIN,
      element.kind ?? '',
    )
    if (ispresent(terrainpage)) {
      return terrainpage
    }
    const objectpage = memoryreadcodepagewithtype(
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
  if (!ispresent(book)) {
    return undefined
  }

  const laddress = NAME(address)
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]
    if (page.id === address || laddress === memoryreadcodepagename(page)) {
      memoryfreecodepage(page)
      book.pages.splice(i, 1)
      memoryupdatebooktoken(book)
      return page
    }
  }

  return undefined
}

export function memoryclearbookflags(book: MAYBE<BOOK>, id: string) {
  if (!ispresent(book)) {
    return
  }
  const boundaryid = book.flags[id]
  if (ispresent(boundaryid)) {
    memoryboundarydelete(boundaryid)
  }
  delete book.flags[id]
}

export function memoryreadelementdisplay(
  element: MAYBE<BOARD_ELEMENT>,
  defaultchar = 1,
  defaultcolor = COLOR.WHITE,
  defaultbg = COLOR.BLACK,
): { name: string; char: number; color: COLOR; bg: COLOR; light: number } {
  const kind = memoryreadboardelementruntime(element)?.kinddata
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
  let codepage = memoryreadcodepagewithtype(book, type, address)
  if (!ispresent(codepage)) {
    const typestr = memorycodepagetypetostring(type)
    codepage = memorycreatecodepage(
      typestr === 'object'
        ? `@${address || 'object'}\n`
        : `@${typestr} ${address}\n`,
      {},
    )
    memorywritecodepage(book, codepage)
    return [codepage, true]
  }
  return [codepage, false]
}

export function memoryexportbookasjson(book: MAYBE<BOOK>): any {
  if (!ispresent(book)) {
    return undefined
  }

  const pagesout: FORMAT_OBJECT[] = []
  for (let i = 0; i < book.pages.length; ++i) {
    const codepage = memoryexportcodepageasjson(book.pages[i])
    if (ispresent(codepage)) {
      pagesout.push(codepage)
    }
  }

  const flagsout: Record<string, any> = {}
  const names = Object.keys(book.flags)
  for (let i = 0; i < names.length; ++i) {
    const name = names[i]
    flagsout[name] = memoryreadbookflags(book, name)
  }

  return {
    id: book.id,
    name: book.name,
    token: book.token,
    timestamp: book.timestamp,
    activelist: book.activelist,
    pages: pagesout,
    flags: flagsout,
  }
}

export function memoryexportbook(book: MAYBE<BOOK>): MAYBE<FORMAT_OBJECT> {
  if (!ispresent(book)) {
    return undefined
  }
  // return a single tree
  return formatobject(book, BOOK_KEYS, {
    pages: (pages) => pages.map(memoryexportcodepage),
    flags: (flags) => {
      const flagsout: Record<string, any> = {}
      const names = Object.keys(flags)
      for (let i = 0; i < names.length; ++i) {
        const name = names[i]
        flagsout[name] = memoryreadbookflags(book, name)
      }
      return flagsout
    },
  })
}

export function memoryhasbookflags(book: MAYBE<BOOK>, id: string) {
  if (!ispresent(book)) {
    return false
  }
  return ispresent(book.flags[id])
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

export function memoryimportbookfromjson(flat: any): MAYBE<BOOK> {
  if (!ispresent(flat)) {
    return undefined
  }

  // import pages
  const pagesout = flat.pages.map(memoryimportcodepagefromjson)

  // import flags
  const names = Object.keys(flat.flags)
  const flagsout: Record<string, string> = {}
  for (let i = 0; i < names.length; ++i) {
    const name = names[i]
    flagsout[name] = memoryboundaryalloc(flat.flags[name], name)
  }

  // return book
  return {
    id: flat.id,
    name: flat.name,
    token: flat.token,
    timestamp: flat.timestamp,
    activelist: flat.activelist,
    pages: pagesout,
    flags: flagsout,
  }
}

export function memoryimportbook(bookentry: MAYBE<FORMAT_OBJECT>): MAYBE<BOOK> {
  const flat = unformatobject<{
    id: string
    name: string
    token: string
    timestamp: number
    activelist: string[]
    pages: CODE_PAGE[]
    flags: Record<string, BOOK_FLAGS>
  }>(bookentry, BOOK_KEYS, {
    pages: (pages) => pages.map(memoryimportcodepage),
  })
  if (!ispresent(flat)) {
    return undefined
  }

  const flags: Record<string, string> = {}
  const flagids = Object.keys(flat.flags ?? {})
  for (let i = 0; i < flagids.length; ++i) {
    const id = flagids[i]
    flags[id] = memoryboundaryalloc(flat.flags[id])
  }

  // return book
  return {
    id: flat.id,
    name: flat.name,
    token: flat.token,
    timestamp: flat.timestamp,
    activelist: flat.activelist ?? [],
    pages: flat.pages,
    flags,
  }
}

export function memoryreadcodepage(
  book: MAYBE<BOOK>,
  address: string,
): MAYBE<CODE_PAGE> {
  if (!ispresent(book)) {
    return undefined
  }
  const laddress = NAME(address)
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]
    if (page.id === address || laddress === memoryreadcodepagename(page)) {
      return page
    }
  }
  return undefined
}

export function memorylistcodepagedatabytype<T extends CODE_PAGE_TYPE>(
  book: MAYBE<BOOK>,
  type: T,
): CODE_PAGE_TYPE_MAP[T][] {
  if (!ispresent(book)) {
    return []
  }
  const out: MAYBE<CODE_PAGE_TYPE_MAP[T]>[] = []
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]
    if (memoryreadcodepagetype(page) === type) {
      out.push(memoryreadcodepagedata<T>(page))
    }
  }
  return out.filter(ispresent)
}

export function memorylistcodepagebystat(
  book: MAYBE<BOOK>,
  statname: string,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  const maybename = NAME(statname)
  const out: MAYBE<CODE_PAGE>[] = []
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]
    const stats = memoryreadcodepagestats(page)
    const codepagename = NAME(memoryreadcodepagename(page))
    if (
      page.id === statname ||
      maybename === codepagename ||
      ispresent(stats[statname])
    ) {
      out.push(page)
    }
  }
  return out.filter(ispresent)
}

export function memorylistcodepagebytype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  const out: MAYBE<CODE_PAGE>[] = []
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]
    if (memoryreadcodepagetype(page) === type) {
      out.push(page)
    }
  }
  return out.filter(ispresent)
}

export function memorylistcodepagebytypeandstat(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  statname: string,
): CODE_PAGE[] {
  if (!ispresent(book)) {
    return []
  }
  const maybename = NAME(statname)
  const out: MAYBE<CODE_PAGE>[] = []
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]
    if (memoryreadcodepagetype(page) === type) {
      const stats = memoryreadcodepagestats(page)
      const codepagename = NAME(memoryreadcodepagename(page))
      if (
        page.id === statname ||
        maybename === codepagename ||
        ispresent(stats[statname])
      ) {
        out.push(page)
      }
    }
  }
  return out.filter(ispresent)
}

export function memoryreadcodepagewithtype(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  address: string,
): MAYBE<CODE_PAGE> {
  if (!ispresent(book)) {
    return undefined
  }
  const laddress = NAME(address)
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]
    if (
      memoryreadcodepagetype(page) === type &&
      (page.id === address || laddress === memoryreadcodepagename(page))
    ) {
      return page
    }
  }
  return undefined
}

export function memoryreadbookflag(
  book: MAYBE<BOOK>,
  id: string,
  name: string,
) {
  const flags = memoryreadbookflags(book, id)
  return flags?.[name]
}

export function memoryreadbookflags(book: MAYBE<BOOK>, id: string): any {
  if (!ispresent(book)) {
    return {}
  }

  // create stub if not present
  const stub = {}
  const boundary = book.flags[id]
  if (!ispresent(boundary)) {
    book.flags[id] = memoryboundaryalloc(stub)
    return stub
  }

  // read boundary
  const flags = memoryboundaryget<BOOK_FLAGS>(boundary)
  if (ispresent(flags)) {
    return flags
  }

  // create stub if not present
  book.flags[id] = memoryboundaryalloc(stub)
  return stub
}

export function memorylistcodepagessorted(book: MAYBE<BOOK>) {
  if (!ispresent(book)) {
    return []
  }
  const pages: CODE_PAGE[] = [...book.pages]
  const sorted = pages.sort((a, b) => {
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

export function memorywritecodepage(
  book: MAYBE<BOOK>,
  codepage: MAYBE<CODE_PAGE>,
): boolean {
  if (!ispresent(book) || !ispresent(codepage)) {
    return false
  }
  const existing = memoryreadcodepage(book, codepage.id)
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
