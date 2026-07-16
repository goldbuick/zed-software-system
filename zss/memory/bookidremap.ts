import {
  createchipid,
  createlayersid,
  createsynthid,
  createtrackingid,
  isfilenamesafeid,
  sanitizesidid,
} from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'

const BOARD_ADDRESS_STATS = [
  'exitnorth',
  'exitsouth',
  'exitwest',
  'exiteast',
  'over',
  'under',
  'camera',
  'charset',
  'palette',
] as const

const DERIVED_FLAG_SUFFIX_BUILDERS = [
  createchipid,
  createsynthid,
  createlayersid,
  createtrackingid,
]

function collectidsfrompage(page: any, ids: string[]) {
  if (!page || typeof page !== 'object') {
    return
  }
  if (typeof page.id === 'string' && page.id) {
    ids.push(page.id)
  }
  for (const key of ['object', 'terrain'] as const) {
    const element = page[key]
    if (
      element &&
      typeof element === 'object' &&
      typeof element.id === 'string' &&
      element.id
    ) {
      ids.push(element.id)
    }
  }
  const board = page.board
  if (!board || typeof board !== 'object') {
    return
  }
  if (typeof board.id === 'string' && board.id) {
    ids.push(board.id)
  }
  const objects = board.objects
  if (!objects || typeof objects !== 'object') {
    return
  }
  const keys = Object.keys(objects)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    ids.push(key)
    const obj = objects[key]
    if (obj && typeof obj === 'object' && typeof obj.id === 'string' && obj.id) {
      ids.push(obj.id)
    }
  }
}

function buildidremap(ids: string[]): Map<string, string> {
  const unique: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]
    if (!id || seen.has(id)) {
      continue
    }
    seen.add(id)
    unique.push(id)
  }

  const taken = new Set<string>()
  for (let i = 0; i < unique.length; ++i) {
    const id = unique[i]
    if (isfilenamesafeid(id)) {
      taken.add(id)
    }
  }

  const map = new Map<string, string>()
  for (let i = 0; i < unique.length; ++i) {
    const id = unique[i]
    if (isfilenamesafeid(id)) {
      continue
    }
    const next = sanitizesidid(id, taken)
    taken.add(next)
    map.set(id, next)
  }
  return map
}

function mapid(map: Map<string, string>, id: string): string {
  return map.get(id) ?? id
}

function remappageids(page: any, map: Map<string, string>) {
  if (!page || typeof page !== 'object' || map.size === 0) {
    return page
  }
  if (typeof page.id === 'string' && page.id) {
    page.id = mapid(map, page.id)
  }
  for (const key of ['object', 'terrain'] as const) {
    const element = page[key]
    if (
      element &&
      typeof element === 'object' &&
      typeof element.id === 'string' &&
      element.id
    ) {
      element.id = mapid(map, element.id)
    }
  }
  const board = page.board
  if (!board || typeof board !== 'object') {
    return page
  }
  if (typeof board.id === 'string' && board.id) {
    board.id = mapid(map, board.id)
  } else if (typeof page.id === 'string') {
    board.id = page.id
  }

  for (let i = 0; i < BOARD_ADDRESS_STATS.length; ++i) {
    const key = BOARD_ADDRESS_STATS[i]
    const value = board[key]
    if (typeof value === 'string' && map.has(value)) {
      board[key] = map.get(value)
    }
  }

  const objects = board.objects
  if (!objects || typeof objects !== 'object') {
    return page
  }
  const nextobjects: Record<string, unknown> = {}
  const keys = Object.keys(objects)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const obj = objects[key]
    let nextkey = mapid(map, key)
    if (obj && typeof obj === 'object') {
      const element = obj as { id?: string }
      if (typeof element.id === 'string' && element.id) {
        element.id = mapid(map, element.id)
        nextkey = element.id
      } else {
        element.id = nextkey
      }
      nextobjects[nextkey] = element
    } else {
      nextobjects[nextkey] = obj
    }
  }
  board.objects = nextobjects
  return page
}

function rewriteidsubstrings(value: unknown, map: Map<string, string>): unknown {
  if (typeof value === 'string') {
    let next = value
    const oldids = [...map.keys()].sort((a, b) => b.length - a.length)
    for (let i = 0; i < oldids.length; ++i) {
      const oldid = oldids[i]
      const newid = map.get(oldid)
      if (!newid || !next.includes(oldid)) {
        continue
      }
      next = next.split(oldid).join(newid)
    }
    return next
  }
  if (Array.isArray(value)) {
    return value.map((entry) => rewriteidsubstrings(entry, map))
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    const keys = Object.keys(value as Record<string, unknown>)
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i]
      out[key] = rewriteidsubstrings(
        (value as Record<string, unknown>)[key],
        map,
      )
    }
    return out
  }
  return value
}

function remapflagowners(
  flags: Record<string, unknown> | undefined,
  map: Map<string, string>,
): Record<string, unknown> | undefined {
  if (!flags || typeof flags !== 'object' || map.size === 0) {
    return flags
  }
  const ownermap = new Map<string, string>()
  const oldids = [...map.keys()]
  for (let i = 0; i < oldids.length; ++i) {
    const oldid = oldids[i]
    const newid = map.get(oldid)
    if (!newid) {
      continue
    }
    ownermap.set(oldid, newid)
    for (let j = 0; j < DERIVED_FLAG_SUFFIX_BUILDERS.length; ++j) {
      const build = DERIVED_FLAG_SUFFIX_BUILDERS[j]
      ownermap.set(build(oldid), build(newid))
    }
  }

  const nextflags: Record<string, unknown> = {}
  const owners = Object.keys(flags)
  for (let i = 0; i < owners.length; ++i) {
    const owner = owners[i]
    const nextowner = ownermap.get(owner) ?? owner
    nextflags[nextowner] = rewriteidsubstrings(flags[owner], map)
  }
  return nextflags
}

/**
 * Deterministically rewrite dotted book/page/object/flag ids on a flat book
 * JSON object (export shape) before import or fixture rewrite.
 * Mutates `book` in place and returns it.
 */
export function remapbookidsforfilenamesafety(book: any): any {
  if (!ispresent(book) || typeof book !== 'object') {
    return book
  }

  const ids: string[] = []
  if (typeof book.id === 'string' && book.id) {
    ids.push(book.id)
  }
  const pages = Array.isArray(book.pages) ? book.pages : []
  for (let i = 0; i < pages.length; ++i) {
    collectidsfrompage(pages[i], ids)
  }

  const map = buildidremap(ids)
  if (map.size === 0) {
    return book
  }

  if (typeof book.id === 'string' && book.id) {
    book.id = mapid(map, book.id)
  }
  for (let i = 0; i < pages.length; ++i) {
    remappageids(pages[i], map)
  }
  book.flags = remapflagowners(book.flags, map)
  return book
}

/**
 * Remap a single flat codepage JSON (page drop) for filename-safe ids.
 * Mutates `page` in place and returns it.
 */
export function remapcodepageidsforfilenamesafety(page: any): any {
  if (!ispresent(page) || typeof page !== 'object') {
    return page
  }
  const ids: string[] = []
  collectidsfrompage(page, ids)
  const map = buildidremap(ids)
  if (map.size === 0) {
    return page
  }
  return remappageids(page, map)
}
