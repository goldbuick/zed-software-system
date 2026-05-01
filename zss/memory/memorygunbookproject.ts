/**
 * BOOK ↔ Gun under `books/<id>`: `pageorder` (`$0`…), `pages/<pageId>/codepage`, `activelist/<player>` → boolean.
 * `lookup` / `named` omitted on wire (runtime-only); callers run `memoryinitboardlookup` on boards after unproject.
 */
import {
  memorygunomitboardruntimekey,
  memorygunprojectvalue,
  memorygunstripmeta,
  memorygununprojectvalue,
} from './memorygunvalueproject'
import { memorygunputprojectedtochain, type MemoryGunChain } from './memorygunputchain'
import type { BOOK, CODE_PAGE } from './types'

const bookprojectopts = { omitkey: memorygunomitboardruntimekey }

function isplainobject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof (v as { then?: unknown }).then !== 'function'
  )
}

export type MemoryBookProjectGunOptions = {
  /** Diff tombstones for removed `pages/*` and `activelist/*` keys. */
  prev?: BOOK
  /** Wipe `books/<id>` then write (replica / full replace; avoids orphan Gun keys). */
  clearbooknodefirst?: boolean
}

/** Write one `BOOK` graph under `bookschain.get(book.id)`. */
export function memorybookprojecttogun(
  bookschain: MemoryGunChain,
  book: BOOK,
  opts?: MemoryBookProjectGunOptions,
): void {
  if (book.id.length === 0) {
    return
  }
  const prev = opts?.prev
  const clearfirst = opts?.clearbooknodefirst ?? false
  if (clearfirst) {
    bookschain.get(book.id).put('')
  }
  const bn = bookschain.get(book.id)
  if (!clearfirst && prev) {
    const nextpageids = new Set(book.pages.map((p) => p.id))
    for (let i = 0; i < prev.pages.length; ++i) {
      const p = prev.pages[i]!
      if (!nextpageids.has(p.id)) {
        bn.get('pages').get(p.id).put('')
      }
    }
    const nextactive = new Set(book.activelist)
    for (let i = 0; i < prev.activelist.length; ++i) {
      const pid = prev.activelist[i]!
      if (!nextactive.has(pid)) {
        bn.get('activelist').get(pid).put('')
      }
    }
  }
  const top: Record<string, unknown> = {
    name: book.name,
    timestamp: book.timestamp,
    flags: book.flags,
  }
  if (book.token !== undefined) {
    top.token = book.token
  }
  memorygunputprojectedtochain(
    bn,
    memorygunprojectvalue(top, bookprojectopts),
    0,
  )
  const pageids = book.pages.map((p) => p.id)
  memorygunputprojectedtochain(
    bn.get('pageorder'),
    memorygunprojectvalue(pageids, bookprojectopts),
    0,
  )
  const activelistwire: Record<string, unknown> = {}
  for (let i = 0; i < book.activelist.length; ++i) {
    activelistwire[book.activelist[i]!] = true
  }
  memorygunputprojectedtochain(bn.get('activelist'), activelistwire, 0)
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]!
    const codewire = memorygunprojectvalue(page, bookprojectopts)
    memorygunputprojectedtochain(
      bn.get('pages').get(page.id).get('codepage'),
      codewire,
      0,
    )
  }
}

function memorybookactivelistfromwire(raw: unknown): string[] {
  if (raw === null || raw === undefined) {
    return []
  }
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string')
  }
  if (!isplainobject(raw)) {
    return []
  }
  const out: string[] = []
  for (const [k, v] of Object.entries(raw)) {
    if (v === true || v === 1) {
      out.push(k)
    }
  }
  return out
}

function memorybookpageorderfromwire(
  pagesobj: Record<string, unknown>,
  stripped: Record<string, unknown>,
): string[] {
  const po = stripped.pageorder
  if (po !== null && po !== undefined) {
    const un = memorygununprojectvalue(memorygunstripmeta(po))
    if (Array.isArray(un)) {
      const ids = un.filter((x): x is string => typeof x === 'string')
      if (ids.length > 0) {
        return ids
      }
    }
  }
  return Object.keys(pagesobj).filter((k) => k.length > 0)
}

/** Merged Gun value under one book id → `BOOK`, or `undefined`. */
export function memorybookunprojectfromgun(
  data: unknown,
  bookid: string,
): BOOK | undefined {
  if (data === null || data === undefined) {
    return undefined
  }
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data) as BOOK
      if (typeof parsed.id === 'string' && Array.isArray(parsed.pages)) {
        parsed.id = bookid
        return parsed
      }
    } catch {
      return undefined
    }
    return undefined
  }
  const strippedraw = memorygunstripmeta(data)
  if (!isplainobject(strippedraw)) {
    return undefined
  }
  const asbook = strippedraw as Partial<BOOK>
  if (
    Array.isArray(asbook.pages) &&
    asbook.flags !== null &&
    asbook.flags !== undefined &&
    typeof asbook.flags === 'object'
  ) {
    return { ...asbook, id: bookid } as BOOK
  }
  const stripped = strippedraw as Record<string, unknown>
  const flags = stripped.flags
  if (flags === null || flags === undefined || typeof flags !== 'object') {
    return undefined
  }
  const pagesraw = stripped.pages
  if (!isplainobject(pagesraw)) {
    return undefined
  }
  const pageorder = memorybookpageorderfromwire(pagesraw, stripped)
  const pages: CODE_PAGE[] = []
  for (let i = 0; i < pageorder.length; ++i) {
    const pid = pageorder[i]!
    const pnode = pagesraw[pid]
    if (!isplainobject(pnode)) {
      continue
    }
    const cpwrap = pnode.codepage
    if (cpwrap === null || cpwrap === undefined) {
      continue
    }
    const pageun = memorygununprojectvalue(cpwrap) as unknown
    if (!isplainobject(pageun)) {
      continue
    }
    const cp = pageun as CODE_PAGE
    cp.id = typeof cp.id === 'string' ? cp.id : pid
    pages.push(cp)
  }
  if (pages.length === 0 && Object.keys(pagesraw).length > 0) {
    return undefined
  }
  const book: BOOK = {
    id: bookid,
    name: typeof stripped.name === 'string' ? stripped.name : '',
    timestamp:
      typeof stripped.timestamp === 'number' ? stripped.timestamp : 0,
    activelist: memorybookactivelistfromwire(stripped.activelist),
    pages,
    flags: flags as BOOK['flags'],
    token: typeof stripped.token === 'string' ? stripped.token : undefined,
  }
  return book
}

/** Plain wire tree for one book (tests / inspection; no Gun). */
export function memorybookwiretree(book: BOOK): Record<string, unknown> {
  const top = memorygunprojectvalue(
    {
      name: book.name,
      timestamp: book.timestamp,
      flags: book.flags,
      ...(book.token !== undefined ? { token: book.token } : {}),
    },
    bookprojectopts,
  ) as Record<string, unknown>
  const pageorder = memorygunprojectvalue(
    book.pages.map((p) => p.id),
    bookprojectopts,
  ) as Record<string, unknown>
  const activelist: Record<string, unknown> = {}
  for (let i = 0; i < book.activelist.length; ++i) {
    activelist[book.activelist[i]!] = true
  }
  const pages: Record<string, unknown> = {}
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]!
    pages[page.id] = {
      codepage: memorygunprojectvalue(page, bookprojectopts),
    }
  }
  return { ...top, pageorder, activelist, pages }
}
