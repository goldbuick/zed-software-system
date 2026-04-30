import type { Operation } from 'fast-json-patch'
import { compare, unescapePathComponent } from 'fast-json-patch'

/** Wildcard: match any semantic parent (root-level keys, unusual layouts). */
export const JSONDIFFSYNC_IGNORE_PARENT = '*' as const

/** Board (`BOARD`) runtime-only keys skipped by memoryexportboard (FORMAT_SKIP). */
const BOARD_RUNTIME_KEYS = [
  'charsetpage',
  'codepage',
  'distmaps',
  'drawallowids',
  'drawlastfp',
  'drawlastxy',
  'drawneedfull',
  'lookup',
  'named',
  'overboard',
  'palettepage',
  'underboard',
] as const

/** Stripped from hub merge local leg (`compare(base, working)`) — FORMAT_SKIP board keys + tick input buffers (not `kinddata`). */
const JSONDIFFSYNC_MERGELEG_RUNTIME_SEGMENTS = new Set<string>([
  ...BOARD_RUNTIME_KEYS,
  'inputqueue',
  'inputmove',
])

/** Board element runtime-only keys skipped by memoryexportboardelement (FORMAT_SKIP). */
const BOARD_TERRAIN_ELEMENT_RUNTIME_KEYS = [
  'id',
  'x',
  'y',
  'lx',
  'ly',
  'code',
  'category',
  'kinddata',
] as const

const BOARD_OBJECT_ELEMENT_RUNTIME_KEYS = ['category', 'kinddata'] as const

/** Subdoc hubs (`flags`, `board`) use neither MEMORY parent/leaffilters nor MEMORY subtree skips. */
export const JSONDIFFSYNC_IGNORE_NONE: readonly [
  parent: string,
  child: string,
][] = []

export const JSONDIFFSYNC_SUBDOC_SUBTREE_SEGMENT = new Set<string>()

/** Top-level `BOOK` fields driven by runtime/tick, not wire deltas (see `books/<id>/timestamp`). */
const BOOK_RUNTIME_KEYS = ['timestamp'] as const

/**
 * Parent/child pairs excluded from outbound deltas and inbound peer patches.
 * Scoped by semantic parent (board vs objects map vs terrain[] vs book pages row); see
 * semanticparentandleafforsegments and runtime-ignores.md.
 *
 * Nested edits under kinddata/stats/lookup/named/gadgetstate/gadgetstore are covered by JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT.
 * **`book.flags.gadgetlayers`** ( **`MEMORY_LABEL.GADGETLAYERS`** row ) syncs canonical board gadget layers (**not** ignored).
 */
export const JSONDIFFSYNC_IGNORE_PARENT_CHILD: readonly [
  parent: string,
  child: string,
][] = [
  ...BOARD_RUNTIME_KEYS.map((child): [string, string] => ['board', child]),
  ...BOARD_TERRAIN_ELEMENT_RUNTIME_KEYS.map((child): [string, string] => [
    'terrain',
    child,
  ]),
  ...BOARD_OBJECT_ELEMENT_RUNTIME_KEYS.map((child): [string, string] => [
    'objects',
    child,
  ]),
  ...BOOK_RUNTIME_KEYS.map((child): [string, string] => ['books', child]),
  ['pages', 'stats'],
]

/**
 * Segment names: ignore the subtree rooted at any of these (nested RFC 6902 paths).
 * `lookup` / `named` are board runtime indexes (see memoryexportboard FORMAT_SKIP); array paths use
 * numeric segments under `lookup`, so parent/leaf pairing on `lookup` alone is insufficient.
 * `gadgetstate` is gadget/UI runtime on the sync root when present (**not synced** via RFC 6902).
 * `gadgetstore` (`book.flags.gadgetstore`) is excluded from deltas; synced **`gadgetlayers`** live under
 * **`book.flags.gadgetlayers`** ( **`MEMORY_LABEL.GADGETLAYERS`** row ), board id → layers sans control, and **do** sync.
 * Text UI is also pushed VM-side via **`vm:acktick`** from the boardrunner; subtree ignore avoids wire churn for `gadgetstate`/store.
 * Board FORMAT_SKIP keys (`drawlastxy`, `drawlastfp`, …) live under `…/pages/<i>/board/<key>/…`; subtree segments
 * catch them when `(board, key)` pairing misses due to semantic parent falling through to a dynamic id.
 * **`inputqueue`** / **`inputmove`** under book flags are tick-local and must not force hub resync.
 */
export const JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT = new Set<string>([
  'gadgetstate',
  'gadgetstore',
  'kinddata',
  'stats',
  ...BOARD_RUNTIME_KEYS,
  'inputqueue',
  'inputmove',
])

/** True when RFC 6902 path is exactly `p` or under `p/`; prefixes omit leading slashes. */
export function jsonpatchpathmatchingstreamingore(
  patchpath: string | undefined,
  prefixes: readonly string[],
): boolean {
  if (patchpath === undefined || prefixes.length === 0) {
    return false
  }
  const body = patchpath.startsWith('/') ? patchpath.slice(1) : patchpath
  for (let i = 0; i < prefixes.length; ++i) {
    const p = prefixes[i]
    if (body === p || body.startsWith(`${p}/`)) {
      return true
    }
  }
  return false
}

/** Drop JSON Patch ops touching paths delegated to sibling jsondiffsync hubs. */
export function filterjsonpatchbystreamingore(
  ops: Operation[],
  prefixes: readonly string[],
): Operation[] {
  if (prefixes.length === 0) {
    return ops
  }
  return ops.filter((op) => {
    if (jsonpatchpathmatchingstreamingore(op.path, prefixes)) {
      return false
    }
    if (
      (op.op === 'move' || op.op === 'copy') &&
      jsonpatchpathmatchingstreamingore(op.from, prefixes)
    ) {
      return false
    }
    return true
  })
}

function pointersegments(pointer: string): string[] {
  if (pointer === '') {
    return []
  }
  const body = pointer.startsWith('/') ? pointer.slice(1) : pointer
  if (body === '') {
    return []
  }
  return body.split('/').map((raw) => unescapePathComponent(raw))
}

/**
 * Last segment is the leaf property name; logical parent skips numeric array indices (RFC 6902
 * segments that are non-negative integers as strings) when resolving the parent key for pairing.
 */
export function logicalparentandleafforsegments(segments: string[]): {
  logicalparent: string | null
  leaf: string
} {
  if (segments.length === 0) {
    return { logicalparent: null, leaf: '' }
  }
  const leaf = segments.at(-1) ?? ''
  if (segments.length === 1) {
    return { logicalparent: null, leaf }
  }
  let i = segments.length - 2
  while (i >= 0 && /^\d+$/.test(segments[i] ?? '')) {
    i--
  }
  const logicalparent = i >= 0 ? (segments[i] ?? null) : null
  return { logicalparent, leaf }
}

/**
 * Semantic parent for (parent, leaf) ignore rules: resolves board.objects[id], board.terrain[i],
 * book.pages[i] row fields, and books[id] top-level fields without treating dynamic ids as the parent.
 */
export function semanticparentandleafforsegments(segments: string[]): {
  semanticparent: string | null
  leaf: string
} {
  if (segments.length === 0) {
    return { semanticparent: null, leaf: '' }
  }
  const leaf = segments.at(-1) ?? ''
  const oidx = segments.lastIndexOf('objects')
  if (oidx >= 0 && segments.length === oidx + 3) {
    return { semanticparent: 'objects', leaf }
  }
  const tidx = segments.lastIndexOf('terrain')
  if (
    tidx >= 0 &&
    segments.length === tidx + 3 &&
    /^\d+$/.test(segments[tidx + 1] ?? '')
  ) {
    return { semanticparent: 'terrain', leaf }
  }
  const len = segments.length
  if (
    len >= 3 &&
    segments[len - 3] === 'pages' &&
    /^\d+$/.test(segments[len - 2] ?? '')
  ) {
    return { semanticparent: 'pages', leaf }
  }
  const booksidx = segments.lastIndexOf('books')
  if (booksidx >= 0 && segments.length === booksidx + 3) {
    return { semanticparent: 'books', leaf }
  }
  const boardidx = segments.lastIndexOf('board')
  if (boardidx >= 0 && boardidx + 1 < segments.length) {
    const boardchild = segments[boardidx + 1] ?? ''
    if ((BOARD_RUNTIME_KEYS as readonly string[]).includes(boardchild)) {
      return { semanticparent: 'board', leaf: boardchild }
    }
  }
  const logical = logicalparentandleafforsegments(segments)
  return {
    semanticparent: logical.logicalparent,
    leaf: logical.leaf,
  }
}

export function pointermatchesignorepair(
  pointer: string,
  rules: readonly [string, string][] = JSONDIFFSYNC_IGNORE_PARENT_CHILD,
  subtreesegment: ReadonlySet<string> = JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT,
): boolean {
  const segments = pointersegments(pointer)
  for (const seg of segments) {
    if (subtreesegment.has(seg)) {
      return true
    }
  }
  const { semanticparent, leaf } = semanticparentandleafforsegments(segments)
  return pairmatchesignore(semanticparent, leaf, rules)
}

export function pairmatchesignore(
  semanticparent: string | null,
  leaf: string,
  rules: readonly [string, string][] = JSONDIFFSYNC_IGNORE_PARENT_CHILD,
): boolean {
  for (let i = 0; i < rules.length; ++i) {
    const rule = rules[i]
    if (rule === undefined) {
      continue
    }
    const [p, c] = rule
    if (c !== leaf) {
      continue
    }
    if (p === JSONDIFFSYNC_IGNORE_PARENT) {
      return true
    }
    if (semanticparent !== null && p === semanticparent) {
      return true
    }
  }
  return false
}

/** @deprecated Prefer JSONDIFFSYNC_IGNORE_PARENT_CHILD */
export const JSONDIFFSYNC_IGNORE_SEGMENTS = new Set<string>(
  JSONDIFFSYNC_IGNORE_PARENT_CHILD.map(([, c]) => c),
)

export function filterjsonpatchforsync(
  ops: Operation[],
  rules: readonly [string, string][] = JSONDIFFSYNC_IGNORE_PARENT_CHILD,
  subtreesegment: ReadonlySet<string> = JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT,
): Operation[] {
  return ops.filter((op) => {
    if (pointermatchesignorepair(op.path, rules, subtreesegment)) {
      return false
    }
    if (
      (op.op === 'move' || op.op === 'copy') &&
      pointermatchesignorepair(op.from, rules, subtreesegment)
    ) {
      return false
    }
    return true
  })
}

function patchusesmergelegruntimesegment(path: string): boolean {
  for (const seg of pointersegments(path)) {
    if (JSONDIFFSYNC_MERGELEG_RUNTIME_SEGMENTS.has(seg)) {
      return true
    }
  }
  return false
}

/** Drops FORMAT_SKIP board paths and tick input buffers from the merge local leg (keeps kinddata ops). */
export function filterjsonpatchmergeleg(ops: Operation[]): Operation[] {
  return ops.filter((op) => {
    if (patchusesmergelegruntimesegment(op.path)) {
      return false
    }
    if (
      (op.op === 'move' || op.op === 'copy') &&
      patchusesmergelegruntimesegment(op.from)
    ) {
      return false
    }
    return true
  })
}

/** True if a and b differ outside ignored (parent, leaf) subtrees; mirrors filterjsonpatchforsync. */
export function hasrelevantsyncdiff(
  a: unknown,
  b: unknown,
  rules: readonly [string, string][] = JSONDIFFSYNC_IGNORE_PARENT_CHILD,
  subtreesegment: ReadonlySet<string> = JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT,
): boolean {
  const pathstack: string[] = []
  return walkrelevantsyncdiff(a, b, pathstack, rules, subtreesegment)
}

function walkrelevantsyncdiff(
  a: unknown,
  b: unknown,
  pathstack: string[],
  rules: readonly [string, string][],
  subtreesegment: ReadonlySet<string>,
): boolean {
  if (Object.is(a, b)) {
    return false
  }
  if (
    a === null ||
    b === null ||
    typeof a !== 'object' ||
    typeof b !== 'object'
  ) {
    return true
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return true
    }
    for (let i = 0; i < a.length; ++i) {
      pathstack.push(String(i))
      try {
        if (pathsegmentsmatchesignore(pathstack, rules, subtreesegment)) {
          continue
        }
        if (
          walkrelevantsyncdiff(a[i], b[i], pathstack, rules, subtreesegment)
        ) {
          return true
        }
      } finally {
        pathstack.pop()
      }
    }
    return false
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return true
  }
  const oa = a as Record<string, unknown>
  const ob = b as Record<string, unknown>
  const keys = new Set([...Object.keys(oa), ...Object.keys(ob)])
  for (const k of keys) {
    pathstack.push(k)
    try {
      const ignoresubtree = pathsegmentsmatchesignore(
        pathstack,
        rules,
        subtreesegment,
      )
      const hasa = Object.prototype.hasOwnProperty.call(oa, k)
      const hasb = Object.prototype.hasOwnProperty.call(ob, k)
      if (!hasa && !hasb) {
        continue
      }
      if (ignoresubtree) {
        continue
      }
      if (!hasa) {
        if (ob[k] !== undefined) {
          return true
        }
        continue
      }
      if (!hasb) {
        if (oa[k] !== undefined) {
          return true
        }
        continue
      }
      if (
        walkrelevantsyncdiff(oa[k], ob[k], pathstack, rules, subtreesegment)
      ) {
        return true
      }
    } finally {
      pathstack.pop()
    }
  }
  return false
}

function pathsegmentsmatchesignore(
  segments: string[],
  rules: readonly [string, string][],
  subtreesegment: ReadonlySet<string>,
): boolean {
  for (const seg of segments) {
    if (subtreesegment.has(seg)) {
      return true
    }
  }
  const { semanticparent, leaf } = semanticparentandleafforsegments(segments)
  return pairmatchesignore(semanticparent, leaf, rules)
}

/** Filtered RFC 6902 ops; skips fast-json-patch compare when only ignored subtrees differ. */
export function jsondiffsyncdiff(
  from: object,
  to: object,
  rules: readonly [string, string][] = JSONDIFFSYNC_IGNORE_PARENT_CHILD,
  subtreesegment: ReadonlySet<string> = JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT,
  streamingorepathprefixes: readonly string[] = [],
  rootsubdocauthority: boolean = false,
): Operation[] {
  if (Object.is(from, to)) {
    return []
  }
  const skipshortcuts =
    streamingorepathprefixes.length > 0 || rootsubdocauthority
  if (!skipshortcuts && !hasrelevantsyncdiff(from, to, rules, subtreesegment)) {
    return []
  }
  let ops = filterjsonpatchforsync(compare(from, to), rules, subtreesegment)
  if (streamingorepathprefixes.length > 0) {
    ops = filterjsonpatchbystreamingore(ops, streamingorepathprefixes)
  }
  return ops
}
