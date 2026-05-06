import { FORMAT_OBJECT, formatobject, unformatobject } from 'zss/feature/format'
import { createnameid, createshortnameid, createsid } from 'zss/mapping/guid'
import { randominteger } from 'zss/mapping/number'
import { MAYBE, deepcopy, ispresent } from 'zss/mapping/types'
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
  memoryimportcodepage,
  memoryreadcodepagedata,
  memoryreadcodepagename,
  memoryreadcodepageruntime,
  memoryreadcodepagestats,
  memoryreadcodepagetype,
} from './codepageoperations'
import {
  memorydeleteboardelementruntime,
  memorydeleteboardruntime,
  memoryreadboardelementruntime,
} from './runtimeboundary'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  BOOK_FLAGS,
  BOOK_KEYS,
  CODE_PAGE,
  CODE_PAGE_TYPE,
  CODE_PAGE_TYPE_MAP,
} from './types'

function memoryreadflagsroot(book: MAYBE<BOOK>): Record<string, BOOK_FLAGS> {
  if (!ispresent(book)) {
    return {}
  }
  const root: Record<string, BOOK_FLAGS> = {}
  const ids = Object.keys(book.flags)
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]
    const boundaryid = book.flags[id]
    const flags = memoryboundaryget<BOOK_FLAGS>(boundaryid)
    if (ispresent(flags)) {
      root[id] = flags
    }
  }
  return root
}

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
      memoryboundarydelete(page.id)
      book.pages.splice(i, 1)
      memoryupdatebooktoken(book)
      return page
    }
  }

  return undefined
}

function memoryfreeboardelementsruntime(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }
  for (let i = 0; i < board.terrain.length; ++i) {
    memorydeleteboardelementruntime(board.terrain[i])
  }
  const ids = Object.keys(board.objects)
  for (let i = 0; i < ids.length; ++i) {
    memorydeleteboardelementruntime(board.objects[ids[i]])
  }
}

export function memoryfreecodepage(codepage: MAYBE<CODE_PAGE>) {
  if (!ispresent(codepage)) {
    return
  }
  const rt = memoryreadcodepageruntime(codepage)
  if (!ispresent(rt)) {
    return
  }
  if (ispresent(rt.board)) {
    memorydeleteboardruntime(rt.board)
    memoryfreeboardelementsruntime(rt.board)
  }
  memorydeleteboardelementruntime(rt.object)
  memorydeleteboardelementruntime(rt.terrain)
  if (ispresent(codepage.runtime)) {
    memoryboundarydelete(codepage.runtime)
  }
  codepage.runtime = undefined
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

export function memoryexportbook(book: MAYBE<BOOK>): MAYBE<FORMAT_OBJECT> {
  if (!ispresent(book)) {
    return undefined
  }

  const pagesout: FORMAT_OBJECT[] = []
  for (let i = 0; i < book.pages.length; ++i) {
    const cp = book.pages[i]
    const ex = memoryexportcodepage(cp)
    if (ispresent(ex)) {
      pagesout.push(ex)
    }
  }

  const flags = deepcopy(memoryreadflagsroot(book))
  const ids = Object.keys(flags)
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]
    if (Object.keys(flags[id]).length === 0) {
      delete flags[id]
    }
  }

  // return a single tree
  return formatobject(
    {
      id: book.id,
      name: book.name,
      timestamp: book.timestamp,
      activelist: book.activelist,
      pages: pagesout,
      flags,
      token: book.token,
    },
    BOOK_KEYS,
    {},
  )
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

export function memoryimportbook(bookentry: MAYBE<FORMAT_OBJECT>): MAYBE<BOOK> {
  const staged = unformatobject<{
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
  if (!ispresent(staged)) {
    return undefined
  }

  for (let i = 0; i < staged.pages.length; ++i) {
    memoryboundaryalloc(staged.pages[i], staged.pages[i].id)
  }
  const flags: Record<string, string> = {}
  const flagids = Object.keys(staged.flags ?? {})
  for (let i = 0; i < flagids.length; ++i) {
    const id = flagids[i]
    flags[id] = memoryboundaryalloc(staged.flags[id])
  }

  // return book
  return {
    id: staged.id,
    name: staged.name,
    token: staged.token,
    timestamp: staged.timestamp,
    activelist: staged.activelist ?? [],
    pages: staged.pages,
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

export function memoryreadbookflags(book: MAYBE<BOOK>, id: string) {
  if (!ispresent(book)) {
    return {}
  }
  let boundaryid = book.flags[id]
  if (!ispresent(boundaryid)) {
    boundaryid = memoryboundaryalloc({})
    book.flags[id] = boundaryid
  }
  const flags = memoryboundaryget<BOOK_FLAGS>(boundaryid)
  if (ispresent(flags)) {
    return flags
  }
  const nextflags: BOOK_FLAGS = {}
  book.flags[id] = memoryboundaryalloc(nextflags, boundaryid)
  return nextflags
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
  memoryboundaryalloc(codepage, codepage.id)
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
  for (let i = 0; i < pages.length; ++i) {
    memoryboundaryalloc(pages[i], pages[i].id)
  }
  return {
    id: createsid(),
    name: createnameid(),
    timestamp: 0,
    activelist: [],
    pages,
    flags: {},
  }
}
