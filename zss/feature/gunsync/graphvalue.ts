/** Deep put / read helpers for Gun `replica` tree (structured graph; arrays as `$0`, `$1`, …). */
import {
  memorybookflushwire,
  memorybookfromwire,
} from 'zss/memory/memorygunbooks'
import { memorygunputprojectedtochain } from 'zss/memory/memorygunputchain'
import {
  memorygunprojectvalue,
  memorygunskipruntime,
} from 'zss/memory/memorygunvalueproject'
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
  const projected = memorygunprojectvalue(obj, [], memorygunskipruntime)
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
  memorybookflushwire(
    bookschain,
    { ...book, id: bookid },
    { clearbooknodefirst: true },
  )
}

/** Build a BOOK from a Gun map callback value (object tree under `books/<id>`). */
export function gunsyncbookfromgraphvalue(
  data: unknown,
  bookid: string,
): BOOK | undefined {
  return memorybookfromwire(data, bookid)
}
