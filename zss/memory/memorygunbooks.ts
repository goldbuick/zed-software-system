/**
 * BOOK wire under `books/<id>`: `pages` as `$0…` array of `{ codepage }`, `activelist/<player>` → boolean.
 * `board.lookup` / `board.named` omitted on wire (runtime-only); callers run `memoryinitboardlookup` after hydrate.
 */
import { isplainobject } from 'zss/mapping/types'

import {
  type MemoryGunChain,
  memorygunputprojectedtochain,
} from './memorygunputchain'
import {
  memorygunprojectvalue,
  memorygunskipcodepagewire,
  memorygununprojectvalue,
} from './memorygunvalueproject'
import type { BOOK, CODE_PAGE } from './types'

export type MemoryBookGunWireOptions = {
  /** Diff tombstones for removed `activelist/*` keys; replaces `pages` subtree when set. */
  prev?: BOOK
  /** Wipe `books/<id>` then write (replica / full replace; avoids orphan Gun keys). */
  clearbooknodefirst?: boolean
}

/** Write one `BOOK` graph under `bookschain.get(book.id)`. */
export function memorybookflushwire(
  bookschain: MemoryGunChain,
  book: BOOK,
  opts?: MemoryBookGunWireOptions,
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
    const nextactive = new Set(book.activelist)
    for (let i = 0; i < prev.activelist.length; ++i) {
      const pid = prev.activelist[i]
      if (!nextactive.has(pid)) {
        bn.get('activelist').get(pid).put('')
      }
    }
    bn.get('pages').put('')
  }
  const top: Record<string, unknown> = {
    name: book.name,
    timestamp: book.timestamp,
    flags: book.flags,
  }
  if (book.token !== undefined) {
    top.token = book.token
  }
  memorygunputprojectedtochain(bn, memorygunprojectvalue(top, []), 0)
  const pageentries = book.pages.map((page) => ({
    codepage: memorygunprojectvalue(page, [], memorygunskipcodepagewire),
  }))
  memorygunputprojectedtochain(
    bn.get('pages'),
    memorygunprojectvalue(pageentries, []),
    0,
  )
  const activelistwire: Record<string, unknown> = {}
  for (let i = 0; i < book.activelist.length; ++i) {
    activelistwire[book.activelist[i]] = true
  }
  memorygunputprojectedtochain(bn.get('activelist'), activelistwire, 0)
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
    const un = Array.isArray(po) ? po : memorygununprojectvalue(po)
    if (Array.isArray(un)) {
      const ids = un.filter((x): x is string => typeof x === 'string')
      if (ids.length > 0) {
        return ids
      }
    }
  }
  return Object.keys(pagesobj).filter((k) => k.length > 0)
}

/** Gun node value under one book id → `BOOK`, or `undefined`. */
export function memorybookfromwire(
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
  const decoded = memorygununprojectvalue(data)
  if (!isplainobject(decoded)) {
    return undefined
  }
  const stripped = decoded
  const asbook = stripped as Partial<BOOK>
  const pagesmaybe = asbook.pages
  const pagesareflatcodepages =
    Array.isArray(pagesmaybe) &&
    (pagesmaybe.length === 0 ||
      (isplainobject(pagesmaybe[0]) &&
        typeof pagesmaybe[0].code === 'string' &&
        !('codepage' in (pagesmaybe[0] as object))))
  if (
    pagesareflatcodepages &&
    asbook.flags !== null &&
    asbook.flags !== undefined &&
    typeof asbook.flags === 'object'
  ) {
    return { ...asbook, id: bookid } as BOOK
  }
  const flags = stripped.flags
  if (flags === null || flags === undefined || typeof flags !== 'object') {
    return undefined
  }
  const pageswired = stripped.pages
  const pages: CODE_PAGE[] = []
  if (Array.isArray(pageswired)) {
    for (let i = 0; i < pageswired.length; ++i) {
      const item = pageswired[i]
      if (!isplainobject(item)) {
        continue
      }
      const row = item
      const cpwrap = row.codepage
      if (cpwrap === null || cpwrap === undefined) {
        continue
      }
      const pageun = memorygununprojectvalue(cpwrap)
      if (!isplainobject(pageun)) {
        continue
      }
      const cp = pageun as CODE_PAGE
      const pid =
        typeof cp.id === 'string'
          ? cp.id
          : typeof row.id === 'string'
            ? row.id
            : String(i)
      cp.id = pid
      pages.push(cp)
    }
  } else if (isplainobject(pageswired)) {
    const pagesobj = pageswired
    const pageorder = memorybookpageorderfromwire(pagesobj, stripped)
    for (let i = 0; i < pageorder.length; ++i) {
      const pid = pageorder[i]
      const pnode = pagesobj[pid]
      if (!isplainobject(pnode)) {
        continue
      }
      const cpwrap = pnode.codepage
      if (cpwrap === null || cpwrap === undefined) {
        continue
      }
      const pageun = memorygununprojectvalue(cpwrap)
      if (!isplainobject(pageun)) {
        continue
      }
      const cp = pageun as CODE_PAGE
      cp.id = typeof cp.id === 'string' ? cp.id : pid
      pages.push(cp)
    }
    if (pages.length === 0 && Object.keys(pagesobj).length > 0) {
      return undefined
    }
  } else if (pageswired !== null && pageswired !== undefined) {
    return undefined
  }
  const book: BOOK = {
    id: bookid,
    name: typeof stripped.name === 'string' ? stripped.name : '',
    timestamp: typeof stripped.timestamp === 'number' ? stripped.timestamp : 0,
    activelist: memorybookactivelistfromwire(stripped.activelist),
    pages,
    flags: flags as BOOK['flags'],
    token: typeof stripped.token === 'string' ? stripped.token : undefined,
  }
  return book
}
