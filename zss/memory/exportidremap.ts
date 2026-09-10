/**
 * Dense integer id remap for URL book export.
 *
 * Only remaps page / board-object / kind-template ids that are safe: either the
 * id string appears once in the whole wire payload, or it is the known
 * codepage.object|terrain.id === codepage.id alias (exactly two occurrences).
 * Ids referenced from flags, board stats, element stats, or code stay as sids.
 * Flag owners / activelist / flag bag strings are never remapped (including
 * when another book in the same compress envelope references them).
 * book.id is never remapped.
 *
 * On import, integer id fields are minted back to fresh sids (same integer ->
 * same sid within one book).
 */
import { FORMAT_OBJECT } from 'zss/feature/format'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

import {
  BOARD_ELEMENT_KEYS,
  BOARD_KEYS,
  BOOK_KEYS,
  CODE_PAGE_KEYS,
} from './types'

function formatgetvalue(formatted: MAYBE<FORMAT_OBJECT>, key: number): any {
  if (!Array.isArray(formatted)) {
    return undefined
  }
  for (let i = 0; i < formatted.length; i += 2) {
    if (formatted[i] === key) {
      return formatted[i + 1]
    }
  }
  return undefined
}

function formatsetvalue(
  formatted: FORMAT_OBJECT,
  key: number,
  value: any,
): void {
  for (let i = 0; i < formatted.length; i += 2) {
    if (formatted[i] === key) {
      formatted[i + 1] = value
      return
    }
  }
}

/**
 * Count non-overlapping substring hits of `id` in one JSON snapshot of the
 * wire tree. Same semantics as `JSON.stringify(payload).split(id).length - 1`,
 * without re-serializing the payload per id.
 */
function countoccurrencesintext(haystack: string, needle: string): number {
  if (!needle) {
    return 0
  }
  let count = 0
  let from = 0
  while (from < haystack.length) {
    const at = haystack.indexOf(needle, from)
    if (at < 0) {
      break
    }
    count += 1
    from = at + needle.length
  }
  return count
}

/** One stringify, then per-id occurrence counts (export remap eligibility). */
function countidsinpayload(
  payload: unknown,
  ids: readonly string[],
): Map<string, number> {
  const counts = new Map<string, number>()
  if (ids.length === 0) {
    return counts
  }
  const text = JSON.stringify(payload)
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]
    if (!id || counts.has(id)) {
      continue
    }
    counts.set(id, countoccurrencesintext(text, id))
  }
  return counts
}

function collectstringsinvalue(value: unknown, out: Set<string>): void {
  if (typeof value === 'string') {
    if (value) {
      out.add(value)
    }
    return
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; ++i) {
      collectstringsinvalue(value[i], out)
    }
    return
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record)
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i]
      if (key) {
        out.add(key)
      }
      collectstringsinvalue(record[key], out)
    }
  }
}

/**
 * Ids that must stay as sids: flag owners, activelist entries, and string
 * values in flag bags (e.g. flags.board). Used so multi-book compress cannot
 * remint a page/player that another book still references.
 */
export function collectflagprotectedids(
  bookwire: MAYBE<FORMAT_OBJECT>,
): Set<string> {
  const out = new Set<string>()
  if (!ispresent(bookwire)) {
    return out
  }
  const activelist = formatgetvalue(bookwire, BOOK_KEYS.activelist)
  if (Array.isArray(activelist)) {
    for (let i = 0; i < activelist.length; ++i) {
      const id = activelist[i]
      if (typeof id === 'string' && id) {
        out.add(id)
      }
    }
  }
  const flags = formatgetvalue(bookwire, BOOK_KEYS.flags)
  if (flags && typeof flags === 'object') {
    collectstringsinvalue(flags, out)
  }
  return out
}

function collectcandidateids(bookwire: FORMAT_OBJECT): string[] {
  const out: string[] = []
  const pages = formatgetvalue(bookwire, BOOK_KEYS.pages)
  if (!Array.isArray(pages)) {
    return out
  }
  for (let i = 0; i < pages.length; ++i) {
    const page = pages[i] as MAYBE<FORMAT_OBJECT>
    const pageid = formatgetvalue(page, CODE_PAGE_KEYS.id)
    if (typeof pageid === 'string' && pageid) {
      out.push(pageid)
    }
    for (const slot of [
      CODE_PAGE_KEYS.object,
      CODE_PAGE_KEYS.terrain,
    ] as const) {
      const element = formatgetvalue(page, slot) as MAYBE<FORMAT_OBJECT>
      const eid = formatgetvalue(element, BOARD_ELEMENT_KEYS.id)
      if (typeof eid === 'string' && eid) {
        out.push(eid)
      }
    }
    const board = formatgetvalue(
      page,
      CODE_PAGE_KEYS.board,
    ) as MAYBE<FORMAT_OBJECT>
    const objects = formatgetvalue(board, BOARD_KEYS.objects)
    if (!Array.isArray(objects)) {
      continue
    }
    for (let j = 0; j < objects.length; ++j) {
      const obj = objects[j] as MAYBE<FORMAT_OBJECT>
      const oid = formatgetvalue(obj, BOARD_ELEMENT_KEYS.id)
      if (typeof oid === 'string' && oid) {
        out.push(oid)
      }
    }
  }
  return out
}

function ispageidstructuralalias(pages: FORMAT_OBJECT[], id: string): boolean {
  for (let i = 0; i < pages.length; ++i) {
    const page = pages[i]
    const pageid = formatgetvalue(page, CODE_PAGE_KEYS.id)
    if (pageid !== id) {
      continue
    }
    for (const slot of [
      CODE_PAGE_KEYS.object,
      CODE_PAGE_KEYS.terrain,
    ] as const) {
      const element = formatgetvalue(page, slot) as MAYBE<FORMAT_OBJECT>
      const eid = formatgetvalue(element, BOARD_ELEMENT_KEYS.id)
      if (eid === id) {
        return true
      }
    }
  }
  return false
}

/** Build string-sid -> dense-int map for remappable ids in one book wire tree. */
export function buildexportidremap(
  bookwire: MAYBE<FORMAT_OBJECT>,
  extraprotected?: ReadonlySet<string>,
): Map<string, number> {
  const map = new Map<string, number>()
  if (!ispresent(bookwire)) {
    return map
  }
  const pages = formatgetvalue(bookwire, BOOK_KEYS.pages)
  if (!Array.isArray(pages)) {
    return map
  }

  const protectedids = collectflagprotectedids(bookwire)
  if (extraprotected) {
    for (const id of extraprotected) {
      protectedids.add(id)
    }
  }

  const candidates = collectcandidateids(bookwire)
  const seen = new Set<string>()
  const unique: string[] = []
  for (let i = 0; i < candidates.length; ++i) {
    const id = candidates[i]
    if (seen.has(id)) {
      continue
    }
    seen.add(id)
    unique.push(id)
  }

  let next = 0
  const counts = countidsinpayload(bookwire, unique)
  for (let i = 0; i < unique.length; ++i) {
    const id = unique[i]
    if (protectedids.has(id)) {
      continue
    }
    const count = counts.get(id) ?? 0
    if (count === 1) {
      map.set(id, next++)
      continue
    }
    if (count === 2 && ispageidstructuralalias(pages, id)) {
      map.set(id, next++)
    }
  }
  return map
}

/** Rewrite remappable id fields in place to dense integers. */
export function applyexportidremap(
  bookwire: MAYBE<FORMAT_OBJECT>,
  map: Map<string, number>,
): void {
  if (!ispresent(bookwire) || map.size === 0) {
    return
  }
  const pages = formatgetvalue(bookwire, BOOK_KEYS.pages)
  if (!Array.isArray(pages)) {
    return
  }
  for (let i = 0; i < pages.length; ++i) {
    const page = pages[i] as FORMAT_OBJECT
    const pageid = formatgetvalue(page, CODE_PAGE_KEYS.id)
    if (typeof pageid === 'string' && map.has(pageid)) {
      formatsetvalue(page, CODE_PAGE_KEYS.id, map.get(pageid)!)
    }
    for (const slot of [
      CODE_PAGE_KEYS.object,
      CODE_PAGE_KEYS.terrain,
    ] as const) {
      const element = formatgetvalue(page, slot) as MAYBE<FORMAT_OBJECT>
      if (!ispresent(element)) {
        continue
      }
      const eid = formatgetvalue(element, BOARD_ELEMENT_KEYS.id)
      if (typeof eid === 'string' && map.has(eid)) {
        formatsetvalue(element, BOARD_ELEMENT_KEYS.id, map.get(eid)!)
      }
    }
    const board = formatgetvalue(
      page,
      CODE_PAGE_KEYS.board,
    ) as MAYBE<FORMAT_OBJECT>
    const objects = formatgetvalue(board, BOARD_KEYS.objects)
    if (!Array.isArray(objects)) {
      continue
    }
    for (let j = 0; j < objects.length; ++j) {
      const obj = objects[j] as FORMAT_OBJECT
      const oid = formatgetvalue(obj, BOARD_ELEMENT_KEYS.id)
      if (typeof oid === 'string' && map.has(oid)) {
        formatsetvalue(obj, BOARD_ELEMENT_KEYS.id, map.get(oid)!)
      }
    }
  }
}

function mintid(id: unknown, map: Map<number, string>): unknown {
  if (typeof id !== 'number' || !Number.isInteger(id)) {
    return id
  }
  let sid = map.get(id)
  if (!sid) {
    sid = createsid()
    map.set(id, sid)
  }
  return sid
}

/**
 * Before unformat, replace integer id fields from export remap with fresh
 * sids on the FORMAT_OBJECT tree. Same integer maps to the same sid within
 * one book.
 */
export function mintcompressedexportids(bookwire: MAYBE<FORMAT_OBJECT>): void {
  if (!ispresent(bookwire)) {
    return
  }
  const map = new Map<number, string>()
  const pages = formatgetvalue(bookwire, BOOK_KEYS.pages)
  if (!Array.isArray(pages)) {
    return
  }
  for (let i = 0; i < pages.length; ++i) {
    const page = pages[i] as FORMAT_OBJECT
    const pageid = formatgetvalue(page, CODE_PAGE_KEYS.id)
    const mintedpageid = mintid(pageid, map)
    if (mintedpageid !== pageid) {
      formatsetvalue(page, CODE_PAGE_KEYS.id, mintedpageid)
    }
    for (const slot of [
      CODE_PAGE_KEYS.object,
      CODE_PAGE_KEYS.terrain,
    ] as const) {
      const element = formatgetvalue(page, slot) as MAYBE<FORMAT_OBJECT>
      if (!ispresent(element)) {
        continue
      }
      const eid = formatgetvalue(element, BOARD_ELEMENT_KEYS.id)
      const mintedeid = mintid(eid, map)
      if (mintedeid !== eid) {
        formatsetvalue(element, BOARD_ELEMENT_KEYS.id, mintedeid)
      }
    }
    const board = formatgetvalue(
      page,
      CODE_PAGE_KEYS.board,
    ) as MAYBE<FORMAT_OBJECT>
    const objects = formatgetvalue(board, BOARD_KEYS.objects)
    if (!Array.isArray(objects)) {
      continue
    }
    for (let j = 0; j < objects.length; ++j) {
      const obj = objects[j] as FORMAT_OBJECT
      const oid = formatgetvalue(obj, BOARD_ELEMENT_KEYS.id)
      const mintedoid = mintid(oid, map)
      if (mintedoid !== oid) {
        formatsetvalue(obj, BOARD_ELEMENT_KEYS.id, mintedoid)
      }
    }
  }
}
