import { FORMAT_OBJECT, formatobject, unformatobject } from 'zss/feature/format'
import { createnameid, createshortnameid, createsid } from 'zss/mapping/guid'
import { randominteger } from 'zss/mapping/number'
import { MAYBE, isarray, isplainobject, ispresent } from 'zss/mapping/types'
import { COLOR, NAME, WORD } from 'zss/words/types'

import { remapbookidsforfilenamesafety } from './bookidremap'
import {
  memorycodepagetypetostring,
  memorycreatecodepage,
  memoryexportcodepage,
  memoryfreecodepage,
  memoryimportcodepage,
  memoryreadcodepagename,
  memoryreadcodepagestats,
  memoryreadcodepagetype,
  memoryresetcodepagestats,
} from './codepageoperations'
import { memoryinvalidatecodepagepickcache } from './codepagepickcache'
import { memoryexportshouldskipflagowner } from './exportflagcache'
import {
  applyexportidremap,
  buildexportidremap,
  mintcompressedexportids,
} from './exportidremap'
import {
  BOARD,
  BOARD_ELEMENT,
  BOOK,
  BOOK_FLAGS,
  BOOK_KEYS,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from './types'

export function memoryreadelementcodepage(
  book: MAYBE<BOOK>,
  element: MAYBE<BOARD_ELEMENT>,
): MAYBE<CODE_PAGE> {
  if (ispresent(element)) {
    const terrainpage = memoryreadcodepage(
      book,
      element.kind ?? '',
      CODE_PAGE_TYPE.TERRAIN,
    )
    if (ispresent(terrainpage)) {
      return terrainpage
    }
    const objectpage = memoryreadcodepage(
      book,
      element.kind ?? '',
      CODE_PAGE_TYPE.OBJECT,
    )
    if (ispresent(objectpage)) {
      return objectpage
    }
  }
  return undefined
}

export function memorydeletecodepage(book: MAYBE<BOOK>, address: string) {
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

export function memoryclearflags(book: MAYBE<BOOK>, id: string) {
  if (!ispresent(book)) {
    return
  }
  book.flags[id] = {}
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
    light: element?.lightsteps ?? kind?.lightsteps ?? 0,
  }
}

export function memoryensurecodepage(
  book: MAYBE<BOOK>,
  type: CODE_PAGE_TYPE,
  address: string,
): [MAYBE<CODE_PAGE>, boolean] {
  let codepage = memoryreadcodepage(book, address, type)
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

export type MEMORY_BOOK_IO_OPTIONS = {
  format?: 'wire' | 'json'
  strip?: boolean
  noremap?: boolean
  protectedids?: ReadonlySet<string>
}

export function memoryexportbook(
  book: MAYBE<BOOK>,
  options?: MEMORY_BOOK_IO_OPTIONS,
): MAYBE<FORMAT_OBJECT | Record<string, unknown>> {
  if (!ispresent(book)) {
    return undefined
  }
  const format = options?.format ?? 'wire'
  // book exporters always stripped kind-default terrain display stats
  const strip = options?.strip !== false
  if (format === 'json') {
    const pagesout: unknown[] = []
    for (let i = 0; i < book.pages.length; ++i) {
      const codepage = memoryexportcodepage(book.pages[i], {
        format: 'json',
        strip,
      })
      if (ispresent(codepage)) {
        pagesout.push(codepage)
      }
    }

    const flagsout: Record<string, any> = {}
    const names = Object.keys(book.flags)
    for (let i = 0; i < names.length; ++i) {
      const name = names[i]
      if (memoryexportshouldskipflagowner(name)) {
        continue
      }
      flagsout[name] = memoryreadflags(book, name)
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

  const pagesout = book.pages.map((codepage) =>
    memoryexportcodepage(codepage, { strip }),
  )
  const wire = Object.assign({}, book, {
    pages: pagesout,
  })
  const formatted = formatobject(wire, BOOK_KEYS, {
    flags: (flags) => {
      const flagsout: Record<string, any> = {}
      const names = Object.keys(flags)
      for (let i = 0; i < names.length; ++i) {
        const name = names[i]
        if (memoryexportshouldskipflagowner(name)) {
          continue
        }
        flagsout[name] = memoryreadflags(book, name)
      }
      return flagsout
    },
  })
  if (!ispresent(formatted)) {
    return undefined
  }
  if (!options?.noremap) {
    applyexportidremap(
      formatted,
      buildexportidremap(formatted, options?.protectedids),
    )
  }
  return formatted
}

export function memoryhasflags(book: MAYBE<BOOK>, id: string) {
  if (!ispresent(book)) {
    return false
  }
  return ispresent(book.flags[id])
}

export function memoryimportbook(
  bookentry: MAYBE<FORMAT_OBJECT | Record<string, unknown>>,
  options?: MEMORY_BOOK_IO_OPTIONS,
): MAYBE<BOOK> {
  const format = options?.format ?? 'wire'
  if (format === 'json') {
    if (!ispresent(bookentry)) {
      return undefined
    }

    const book = remapbookidsforfilenamesafety(bookentry)

    const pagesout = book.pages.map((page: any) =>
      memoryimportcodepage(page, { format: 'json' }),
    )

    const names = Object.keys(book.flags ?? {})
    const flagsout: Record<string, BOOK_FLAGS> = {}
    for (let i = 0; i < names.length; ++i) {
      const name = names[i]
      const bag = book.flags[name]
      flagsout[name] = isplainobject(bag) ? (bag as BOOK_FLAGS) : {}
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

  mintcompressedexportids(bookentry as MAYBE<FORMAT_OBJECT>)
  const flat = unformatobject<{
    id: string
    name: string
    token: string
    timestamp: number
    activelist: string[]
    pages: MAYBE<FORMAT_OBJECT>[]
    flags: Record<string, BOOK_FLAGS>
  }>(bookentry as MAYBE<FORMAT_OBJECT>, BOOK_KEYS)
  if (!ispresent(flat)) {
    return undefined
  }

  const pagesout = (flat.pages ?? [])
    .map((entry) => memoryimportcodepage(entry))
    .filter(ispresent)

  const flags: Record<string, BOOK_FLAGS> = {}
  const flagids = Object.keys(flat.flags ?? {})
  for (let i = 0; i < flagids.length; ++i) {
    const id = flagids[i]
    const bag = flat.flags[id]
    flags[id] = isplainobject(bag) ? bag : {}
  }

  return {
    id: flat.id,
    name: flat.name,
    token: flat.token,
    timestamp: flat.timestamp,
    activelist: flat.activelist ?? [],
    pages: pagesout,
    flags,
  }
}

export type MEMORY_CODEPAGE_FILTER = {
  type?: CODE_PAGE_TYPE
  stat?: string
  sort?: boolean
}

function normalizebooklist(
  bookorbooks: MAYBE<BOOK> | MAYBE<BOOK>[] | undefined,
): BOOK[] {
  if (!ispresent(bookorbooks)) {
    return []
  }
  if (isarray(bookorbooks)) {
    return bookorbooks.filter(ispresent)
  }
  return [bookorbooks]
}

function codepagematchesstat(page: CODE_PAGE, statname: string): boolean {
  const maybename = NAME(statname)
  const stats = memoryreadcodepagestats(page)
  const codepagename = NAME(memoryreadcodepagename(page))
  return (
    page.id === statname ||
    maybename === codepagename ||
    ispresent(stats[statname])
  )
}

function sortcodepages(pages: CODE_PAGE[]): CODE_PAGE[] {
  return [...pages].sort((a, b) => {
    const atype = memoryreadcodepagetype(a)
    const btype = memoryreadcodepagetype(b)
    if (atype === btype) {
      return memoryreadcodepagename(a).localeCompare(memoryreadcodepagename(b))
    }
    return btype - atype
  })
}

export function memoryreadcodepage(
  bookorbooks: MAYBE<BOOK> | MAYBE<BOOK>[],
  address: string,
  type?: CODE_PAGE_TYPE,
): MAYBE<CODE_PAGE> {
  const books = normalizebooklist(bookorbooks)
  for (let b = 0; b < books.length; ++b) {
    const book = books[b]
    for (let i = 0; i < book.pages.length; ++i) {
      const page = book.pages[i]
      if (ispresent(type) && memoryreadcodepagetype(page) !== type) {
        continue
      }
      // id, name, or page stat (e.g. @zztboard0 from ZZT import)
      if (codepagematchesstat(page, address)) {
        return page
      }
    }
  }
  return undefined
}

export function memorylistcodepage(
  bookorbooks: MAYBE<BOOK> | MAYBE<BOOK>[],
  filter?: MEMORY_CODEPAGE_FILTER,
): CODE_PAGE[] {
  const books = normalizebooklist(bookorbooks)
  const out: CODE_PAGE[] = []
  const seen = new Set<string>()
  for (let b = 0; b < books.length; ++b) {
    const book = books[b]
    let pages: CODE_PAGE[] = []
    for (let i = 0; i < book.pages.length; ++i) {
      const page = book.pages[i]
      if (
        ispresent(filter?.type) &&
        memoryreadcodepagetype(page) !== filter.type
      ) {
        continue
      }
      if (ispresent(filter?.stat) && !codepagematchesstat(page, filter.stat)) {
        continue
      }
      pages.push(page)
    }
    if (filter?.sort) {
      pages = sortcodepages(pages)
    }
    for (let i = 0; i < pages.length; ++i) {
      const page = pages[i]
      if (seen.has(page.id)) {
        continue
      }
      seen.add(page.id)
      out.push(page)
    }
  }
  return out
}

export function memoryreadflag(book: MAYBE<BOOK>, id: string, name: string) {
  const flags = memoryreadflags(book, id)
  return flags?.[name]
}

export function memoryreadflags(book: MAYBE<BOOK>, id: string): BOOK_FLAGS {
  if (!ispresent(book)) {
    return {}
  }

  const flags = book.flags[id]
  if (isplainobject(flags)) {
    return flags
  }

  book.flags[id] = {}
  return book.flags[id]
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
  memoryinvalidatecodepagepickcache()
  return true
}

export function memoryupsertcodepage(
  book: MAYBE<BOOK>,
  flat: {
    id: string
    code: string
    board?: Record<string, unknown>
    object?: Record<string, unknown>
    terrain?: Record<string, unknown>
    charset?: Record<string, unknown>
    palette?: Record<string, unknown>
  },
): boolean {
  if (!ispresent(book)) {
    return false
  }
  const existing = memoryreadcodepage(book, flat.id)
  if (!ispresent(existing)) {
    const page = memoryimportcodepage(flat, { format: 'json' })
    if (!page) {
      return false
    }
    return memorywritecodepage(book, page)
  }
  existing.code = flat.code
  if (flat.board && typeof flat.board === 'object') {
    const board = flat.board as { id?: string; objects?: unknown }
    board.id = flat.id
    if (!board.objects || typeof board.objects !== 'object') {
      board.objects = {}
    }
    existing.board = flat.board as unknown as BOARD
  } else {
    existing.board = undefined
  }
  existing.object = flat.object as unknown as BOARD_ELEMENT | undefined
  existing.terrain = flat.terrain as unknown as BOARD_ELEMENT | undefined
  existing.charset = flat.charset as typeof existing.charset
  existing.palette = flat.palette as typeof existing.palette
  memoryresetcodepagestats(existing)
  return true
}

export function memorywriteflag(
  book: MAYBE<BOOK>,
  id: string,
  name: string,
  value: WORD,
) {
  const flags = memoryreadflags(book, id)
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
