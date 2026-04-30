/** Deep put / read helpers for Gun `replica` tree (no JSON string leaves for structured data). */
import type { BOOK } from 'zss/memory/types'

/** Gun rejects `.get('')` with `0 length key!` — skip empty path segments. */

/** Minimal chain surface used by Gun `get` / `put`. */
export type Gunsyncgunchain = {
  get: (k: string) => Gunsyncgunchain
  put: (v: unknown) => unknown
}

function isdeepobject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    !(v instanceof Set) &&
    typeof (v as { then?: unknown }).then !== 'function'
  )
}

/** Recursively write JSON-shaped values as Gun keys (arrays → numeric string indices; plain objects recurse). */
export function gunsyncputobjecttograph(
  node: Gunsyncgunchain,
  obj: Record<string, unknown>,
  depth: number,
): void {
  if (depth > 60) {
    return
  }
  const keys = Object.keys(obj)
  for (let i = 0; i < keys.length; ++i) {
    const k = keys[i]!
    if (k.length === 0) {
      continue
    }
    const v = obj[k]
    if (v === undefined) {
      continue
    }
    const child = node.get(k)
    if (v === null) {
      child.put(null)
      continue
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      child.put(v)
      continue
    }
    if (v instanceof Set) {
      const arr = [...v]
      for (let j = 0; j < arr.length; ++j) {
        gunsyncputvalueat(child.get(String(j)), arr[j], depth + 1)
      }
      continue
    }
    if (Array.isArray(v)) {
      for (let j = 0; j < v.length; ++j) {
        gunsyncputvalueat(child.get(String(j)), v[j], depth + 1)
      }
      continue
    }
    if (isdeepobject(v)) {
      gunsyncputobjecttograph(child, v, depth + 1)
    }
  }
}

function gunsyncputvalueat(
  node: Gunsyncgunchain,
  v: unknown,
  depth: number,
): void {
  if (depth > 60) {
    return
  }
  if (v === undefined) {
    return
  }
  if (v === null) {
    node.put(null)
    return
  }
  if (
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
  ) {
    node.put(v)
    return
  }
  if (v instanceof Set) {
    const arr = [...v]
    for (let j = 0; j < arr.length; ++j) {
      gunsyncputvalueat(node.get(String(j)), arr[j], depth + 1)
    }
    return
  }
  if (Array.isArray(v)) {
    for (let j = 0; j < v.length; ++j) {
      gunsyncputvalueat(node.get(String(j)), v[j], depth + 1)
    }
    return
  }
  if (isdeepobject(v)) {
    gunsyncputobjecttograph(node, v, depth + 1)
  }
}

export function gunsyncputbooktograph(
  bookschain: Gunsyncgunchain,
  bookid: string,
  book: BOOK,
): void {
  if (bookid.length === 0) {
    return
  }
  const booknode = bookschain.get(bookid)
  gunsyncputobjecttograph(
    booknode,
    book as unknown as Record<string, unknown>,
    0,
  )
}

/** Strip Gun `._` meta and convert plain objects recursively (Sets → arrays). */
export function gunsyncstripgunmeta(v: unknown): unknown {
  if (v === null || v === undefined) {
    return v
  }
  if (typeof v !== 'object') {
    return v
  }
  if (v instanceof Set) {
    return [...v].map(gunsyncstripgunmeta)
  }
  if (Array.isArray(v)) {
    return v.map(gunsyncstripgunmeta)
  }
  const o = v as Record<string, unknown>
  const out: Record<string, unknown> = {}
  const keys = Object.keys(o)
  for (let i = 0; i < keys.length; ++i) {
    const k = keys[i]!
    if (k === '_' || k.length === 0) {
      continue
    }
    out[k] = gunsyncstripgunmeta(o[k])
  }
  return out
}

/** Build a BOOK from a Gun map callback value (object tree under `books/<id>`). */
export function gunsyncbookfromgraphvalue(
  data: unknown,
  bookid: string,
): BOOK | undefined {
  if (data === null || data === undefined) {
    return undefined
  }
  const stripped = gunsyncstripgunmeta(data)
  if (!isdeepobject(stripped)) {
    return undefined
  }
  const b = stripped as Partial<BOOK>
  if (!Array.isArray(b.pages)) {
    return undefined
  }
  if (b.flags === null || b.flags === undefined || typeof b.flags !== 'object') {
    return undefined
  }
  return {
    id: bookid,
    name: typeof b.name === 'string' ? b.name : '',
    timestamp: typeof b.timestamp === 'number' ? b.timestamp : 0,
    activelist: Array.isArray(b.activelist) ? (b.activelist as string[]) : [],
    pages: b.pages,
    flags: b.flags as BOOK['flags'],
    token: typeof b.token === 'string' ? b.token : undefined,
  }
}
