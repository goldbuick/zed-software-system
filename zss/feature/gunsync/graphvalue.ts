/** Deep put / read helpers for Gun `replica` tree (structured graph; arrays as `$0`, `$1`, …). */
import type { BOOK } from 'zss/memory/types'
import { memorybookunprojectfromgun, memorybookprojecttogun } from 'zss/memory/memorygunbookproject'
import {
  memorygunomitboardruntimekey,
  memorygunprojectvalue,
} from 'zss/memory/memorygunvalueproject'
import { memorygunputprojectedtochain } from 'zss/memory/memorygunputchain'

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

/** Recursively write JSON-shaped values as Gun keys (arrays → `$0`, `$1`, …; plain objects recurse). */
export function gunsyncputobjecttograph(
  node: Gunsyncgunchain,
  obj: Record<string, unknown>,
  depth: number,
): void {
  if (depth > 60) {
    return
  }
  if (!isdeepobject(obj)) {
    return
  }
  const projected = memorygunprojectvalue(obj, {
    omitkey: memorygunomitboardruntimekey,
  })
  memorygunputprojectedtochain(node, projected, depth)
}

export function gunsyncputbooktograph(
  bookschain: Gunsyncgunchain,
  bookid: string,
  book: BOOK,
): void {
  if (bookid.length === 0) {
    return
  }
  memorybookprojecttogun(
    bookschain,
    { ...book, id: bookid },
    { clearbooknodefirst: true },
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
  return memorybookunprojectfromgun(data, bookid)
}
