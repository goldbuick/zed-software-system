import type { Operation } from 'fast-json-patch'
import { compare } from 'fast-json-patch'
import type { DEVICELIKE } from 'zss/device/types'
import {
  clearlasthostpushdoc,
  readlasthostpushdoc,
  readpendingsync,
  readzedcafeguestdirty,
  readzedcafepollactive,
  setlasthostpushdoc,
} from 'zss/device/wanixclient/state'
import {
  wanixperfdelta,
  wanixperfmark,
  wanixperfnow,
} from 'zss/feature/wanix/wanixperf'
import {
  WANIX_ZEDCAFE_EXPORT_COALESCE_MS,
  WANIX_ZEDCAFE_EXPORT_COALESCE_SINGLE_MS,
  WANIX_ZEDCAFE_EXPORT_COALESCE_TERRAIN_MS,
} from 'zss/feature/wanix/wanixzedcafeconstants'
import {
  assertzedcafeexportvalid,
  readzedcafebookprefix,
  readzedcafebookstatspath,
  readzedcafepageprefix,
} from 'zss/feature/wanix/zedcafetreeschema'
import { ispresent } from 'zss/mapping/types'
import { memoryreadbookflags } from 'zss/memory/bookoperations'
import {
  memoryexportcodepageasjson,
  memoryreadcodepagename,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memoryreadbooklist, memoryreadoperator } from 'zss/memory/session'
import { BOARD_SIZE } from 'zss/memory/types'
import type { BOOK, CODE_PAGE } from 'zss/memory/types'

export type WANIX_ZED_CAFE_EXPORT_FILE = {
  path: string
  bytes: Uint8Array
}

export type WANIX_ZED_CAFE_EXPORT_PAYLOAD = {
  files: WANIX_ZED_CAFE_EXPORT_FILE[]
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

let exportinflight = false
/** Generation of queued host dirty; advances on every mark. */
let exportdirtygen = 0
/** Generation last successfully synced to guest. */
let exportackgen = 0
/** Monotonic counter surfaced as `stats.json` `exportRevision`; bumps on push ack. */
let exportrevision = 0
/** When true, next flush rebuilds the full path document from memory. */
let structuraldirty = true
/** Narrow dirty export paths (when structuraldirty is false). */
const dirtypaths = new Set<string>()
let lastflushms = 0
/** Build generation captured for the in-flight push. */
let inflightbuildgen = 0

function encodetext(text: string): Uint8Array {
  return encoder.encode(text)
}

function encodejson(value: unknown): Uint8Array {
  return encodetext(`${JSON.stringify(value, null, 2)}\n`)
}

function bumpdirtygen() {
  exportdirtygen += 1
}

/** Advance the export revision counter (called on each acknowledged push). */
export function bumpexportrevision(): number {
  exportrevision += 1
  return exportrevision
}

/** Current export revision, surfaced in `stats.json` as `exportRevision`. */
export function readexportrevision(): number {
  return exportrevision
}

/** Decode RFC 6902 JSON Pointer into path segments (`~1` → `/`, `~0` → `~`). */
export function decodezedcafejsonpointer(pointer: string): string[] {
  if (!pointer || pointer === '/') {
    return []
  }
  const raw = pointer.startsWith('/') ? pointer.slice(1) : pointer
  if (!raw) {
    return []
  }
  const parts = raw.split('/')
  const out: string[] = []
  for (let i = 0; i < parts.length; ++i) {
    out.push(parts[i].replace(/~1/g, '/').replace(/~0/g, '~'))
  }
  return out
}

function stripstatsexportedat(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value
  }
  const record = value as Record<string, unknown>
  if (!('exportedAt' in record)) {
    return value
  }
  const rest: Record<string, unknown> = { ...record }
  delete rest.exportedAt
  return rest
}

/** Path-keyed parsed JSON; root `stats.json` omits volatile `exportedAt`. */
export function zedcafeexportfilestodoc(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): Record<string, unknown> {
  const doc: Record<string, unknown> = {}
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    try {
      const parsed: unknown = JSON.parse(decoder.decode(file.bytes))
      doc[file.path] =
        file.path === 'stats.json' ? stripstatsexportedat(parsed) : parsed
    } catch {
      doc[file.path] = null
    }
  }
  return doc
}

/** Encode a path document into files; optionally restrict to changed paths. */
export function zedcafeexportdoctofiles(
  doc: Record<string, unknown>,
  onlypaths?: Set<string>,
): WANIX_ZED_CAFE_EXPORT_FILE[] {
  const files: WANIX_ZED_CAFE_EXPORT_FILE[] = []
  const paths = onlypaths ? [...onlypaths] : Object.keys(doc)
  for (let i = 0; i < paths.length; ++i) {
    const path = paths[i]
    if (!(path in doc)) {
      continue
    }
    const value = doc[path]
    files.push({
      path,
      bytes: encodejson(
        path === 'stats.json' && value && typeof value === 'object'
          ? {
              ...(value as Record<string, unknown>),
              exportedAt: new Date().toISOString(),
              exportRevision: readexportrevision(),
            }
          : value,
      ),
    })
  }
  return files
}

/** File paths that need upsert from a compare(shadow, next) patch. */
export function readzedcafeexportupsertpaths(ops: Operation[]): Set<string> {
  const upsert = new Set<string>()
  for (let i = 0; i < ops.length; ++i) {
    const op = ops[i]
    const parts = decodezedcafejsonpointer(op.path)
    if (parts.length === 0) {
      continue
    }
    const filepath = parts[0]
    if (op.op === 'remove' && parts.length === 1) {
      continue
    }
    upsert.add(filepath)
    if (
      (op.op === 'move' || op.op === 'copy') &&
      'from' in op &&
      typeof op.from === 'string'
    ) {
      const fromparts = decodezedcafejsonpointer(op.from)
      if (fromparts.length > 0) {
        upsert.add(fromparts[0])
      }
    }
  }
  return upsert
}

/** Top-level remove ops → export-relative file paths to delete on guest. */
export function readzedcafeexportremovepaths(ops: Operation[]): Set<string> {
  const remove = new Set<string>()
  for (let i = 0; i < ops.length; ++i) {
    const op = ops[i]
    if (op.op !== 'remove') {
      continue
    }
    const parts = decodezedcafejsonpointer(op.path)
    if (parts.length === 1) {
      remove.add(parts[0])
    }
  }
  return remove
}

export function zedcafeexportdocsdiffer(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  return compare(left, right).length > 0
}

export function buildzedcafestats(books: BOOK[]) {
  return {
    exportedAt: new Date().toISOString(),
    exportRevision: readexportrevision(),
    bookCount: books.length,
    books: books.map((book) => ({
      id: book.id,
      name: book.name,
      pageCount: book.pages.length,
    })),
  }
}

export function readbookcountfromexportfiles(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): number {
  const stats = files.find((file) => file.path === 'stats.json')
  if (!stats) {
    return -1
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(stats.bytes)) as {
      bookCount?: unknown
    }
    return typeof parsed.bookCount === 'number' ? parsed.bookCount : -1
  } catch {
    return -1
  }
}

/** Host/guest export content-ready: non-empty stats.json with exportedAt + bookCount. */
export function readzedcafeexportstatscontentready(bytes: Uint8Array): boolean {
  if (bytes.byteLength === 0) {
    return false
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
      exportedAt?: unknown
      bookCount?: unknown
    }
    return (
      typeof parsed.exportedAt === 'string' &&
      parsed.exportedAt.length > 0 &&
      typeof parsed.bookCount === 'number'
    )
  } catch {
    return false
  }
}

export function buildzedcafebookmeta(book: BOOK) {
  const pages: { id: string; type: string; name: string | undefined }[] = []
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]
    pages.push({
      id: page.id,
      type: memoryreadcodepagetypeasstring(page),
      name: memoryreadcodepagename(page),
    })
  }
  return {
    id: book.id,
    name: book.name,
    token: book.token,
    activelist: book.activelist,
    pages,
  }
}

export function buildzedcafebookflagfiles(
  book: BOOK,
): WANIX_ZED_CAFE_EXPORT_FILE[] {
  const prefix = readzedcafebookprefix(book)
  const files: WANIX_ZED_CAFE_EXPORT_FILE[] = []
  const names = Object.keys(book.flags ?? {})
  for (let i = 0; i < names.length; ++i) {
    const name = names[i]
    files.push({
      path: `${prefix}/flags/${name}.json`,
      bytes: encodejson(memoryreadbookflags(book, name)),
    })
  }
  return files
}

function splitboarddoc(
  boardjson: Record<string, unknown>,
  prefix: string,
  doc: Record<string, unknown>,
) {
  const { terrain, objects, ...stats } = boardjson
  if (Array.isArray(terrain) && terrain.length > 0) {
    if (terrain.length !== BOARD_SIZE) {
      throw new Error(
        `zedcafe board terrain length ${terrain.length} != ${BOARD_SIZE}`,
      )
    }
    doc[`${prefix}/board/terrain.json`] = terrain
  }
  if (Object.keys(stats).length > 0) {
    doc[`${prefix}/board/stats.json`] = stats
  }
  if (ispresent(objects) && typeof objects === 'object') {
    const entries = Object.entries(objects as Record<string, unknown>)
    for (let i = 0; i < entries.length; ++i) {
      const [objid, obj] = entries[i]
      doc[`${prefix}/board/objects/${objid}.json`] = obj
    }
  }
}

export function splitboardexport(
  boardjson: Record<string, unknown>,
): WANIX_ZED_CAFE_EXPORT_FILE[] {
  const doc: Record<string, unknown> = {}
  splitboarddoc(boardjson, '', doc)
  // strip leading slash keys from empty prefix
  const files: WANIX_ZED_CAFE_EXPORT_FILE[] = []
  const keys = Object.keys(doc)
  for (let i = 0; i < keys.length; ++i) {
    const path = keys[i].replace(/^\//, '')
    files.push({ path, bytes: encodejson(doc[keys[i]]) })
  }
  return files
}

function buildcodepagedoc(
  book: BOOK,
  page: CODE_PAGE,
  doc: Record<string, unknown>,
) {
  const pagejson = memoryexportcodepageasjson(page)
  if (pagejson === undefined) {
    return
  }
  const prefix = readzedcafepageprefix(book, page)
  doc[`${prefix}/stats.json`] = {
    id: page.id,
    code: page.code,
    type: memoryreadcodepagetypeasstring(page),
    name: memoryreadcodepagename(page),
  }
  if (ispresent(pagejson.board)) {
    splitboarddoc(pagejson.board as Record<string, unknown>, prefix, doc)
  }
  if (ispresent(pagejson.object)) {
    doc[`${prefix}/object/element.json`] = pagejson.object
  }
  if (ispresent(pagejson.terrain)) {
    doc[`${prefix}/terrain/element.json`] = pagejson.terrain
  }
  if (ispresent(pagejson.charset)) {
    doc[`${prefix}/charset/bitmap.json`] = pagejson.charset
  }
  if (ispresent(pagejson.palette)) {
    doc[`${prefix}/palette/bitmap.json`] = pagejson.palette
  }
}

export function buildzedcafecodepagefiles(
  book: BOOK,
  page: CODE_PAGE,
): WANIX_ZED_CAFE_EXPORT_FILE[] {
  const doc: Record<string, unknown> = {}
  buildcodepagedoc(book, page, doc)
  return zedcafeexportdoctofiles(doc)
}

/** Build path→value document from current sim memory (primary representation). */
export function buildzedcafeexportdoc(): Record<string, unknown> {
  const books = memoryreadbooklist()
  const doc: Record<string, unknown> = {}
  doc['stats.json'] = stripstatsexportedat(buildzedcafestats(books))
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    doc[readzedcafebookstatspath(book)] = buildzedcafebookmeta(book)
    const names = Object.keys(book.flags ?? {})
    const prefix = readzedcafebookprefix(book)
    for (let j = 0; j < names.length; ++j) {
      const name = names[j]
      doc[`${prefix}/flags/${name}.json`] = memoryreadbookflags(book, name)
    }
    for (let j = 0; j < book.pages.length; ++j) {
      buildcodepagedoc(book, book.pages[j], doc)
    }
  }
  return doc
}

/**
 * Rebuild only named paths into `base` from memory.
 * Unknown paths fall through as structural (caller should full rebuild).
 */
export function rebuildzedcafeexportpaths(
  base: Record<string, unknown>,
  paths: Iterable<string>,
): boolean {
  const books = memoryreadbooklist()
  const bybook = new Map<string, BOOK>()
  for (let i = 0; i < books.length; ++i) {
    bybook.set(readzedcafebookprefix(books[i]), books[i])
  }
  const pathlist = [...paths]
  for (let i = 0; i < pathlist.length; ++i) {
    const path = pathlist[i]
    if (path === 'stats.json') {
      base[path] = stripstatsexportedat(buildzedcafestats(books))
      continue
    }
    const segments = path.split('/')
    if (segments.length < 2) {
      return false
    }
    const bookprefix = segments[0]
    const book = bybook.get(bookprefix)
    if (!book) {
      return false
    }
    if (segments[1] === 'stats.json' && segments.length === 2) {
      base[path] = buildzedcafebookmeta(book)
      continue
    }
    if (segments[1] === 'flags' && segments.length === 3) {
      const owner = segments[2].replace(/\.json$/, '')
      base[path] = memoryreadbookflags(book, owner)
      continue
    }
    if (segments.length < 3) {
      return false
    }
    const pageprefix = `${segments[0]}/${segments[1]}`
    let page: CODE_PAGE | undefined
    for (let j = 0; j < book.pages.length; ++j) {
      if (readzedcafepageprefix(book, book.pages[j]) === pageprefix) {
        page = book.pages[j]
        break
      }
    }
    if (!page) {
      return false
    }
    const pagejson = memoryexportcodepageasjson(page)
    if (!pagejson) {
      return false
    }
    if (segments[2] === 'stats.json' && segments.length === 3) {
      base[path] = {
        id: page.id,
        code: page.code,
        type: memoryreadcodepagetypeasstring(page),
        name: memoryreadcodepagename(page),
      }
      continue
    }
    if (
      segments[2] === 'board' &&
      segments[3] === 'terrain.json' &&
      segments.length === 4
    ) {
      const board = pagejson.board as Record<string, unknown> | undefined
      if (!board || !Array.isArray(board.terrain)) {
        delete base[path]
        continue
      }
      if (board.terrain.length !== BOARD_SIZE) {
        throw new Error(
          `zedcafe board terrain length ${board.terrain.length} != ${BOARD_SIZE}`,
        )
      }
      base[path] = board.terrain
      continue
    }
    if (
      segments[2] === 'board' &&
      segments[3] === 'stats.json' &&
      segments.length === 4
    ) {
      const board = pagejson.board as Record<string, unknown> | undefined
      if (!board) {
        delete base[path]
        continue
      }
      const stats = { ...board }
      delete stats.terrain
      delete stats.objects
      base[path] = stats
      continue
    }
    if (
      segments[2] === 'board' &&
      segments[3] === 'objects' &&
      segments.length === 5
    ) {
      const board = pagejson.board as Record<string, unknown> | undefined
      const objid = segments[4].replace(/\.json$/, '')
      const objects = board?.objects as Record<string, unknown> | undefined
      if (!objects || !(objid in objects)) {
        delete base[path]
        continue
      }
      base[path] = objects[objid]
      continue
    }
    // Fall back: rebuild whole page subtree then keep only this path.
    const pagedoc: Record<string, unknown> = {}
    buildcodepagedoc(book, page, pagedoc)
    if (!(path in pagedoc)) {
      delete base[path]
      continue
    }
    base[path] = pagedoc[path]
  }
  return true
}

export function buildzedcafeexportfiles(): WANIX_ZED_CAFE_EXPORT_FILE[] {
  const doc = buildzedcafeexportdoc()
  const files = zedcafeexportdoctofiles(doc)
  assertzedcafeexportvalid(files)
  return files
}

/** Set last-pushed export shadow from files (or current memory export). */
export function primezedcafeexportshadow(
  files?: WANIX_ZED_CAFE_EXPORT_FILE[],
  options?: { retainpendingdirty?: boolean },
) {
  const source = files ?? buildzedcafeexportfiles()
  setlasthostpushdoc(zedcafeexportfilestodoc(source))
  if (options?.retainpendingdirty) {
    return
  }
  exportackgen = exportdirtygen
  structuraldirty = false
  dirtypaths.clear()
}

export type ZEDCAFE_EXPORT_PENDING_DIRTY = {
  structural: boolean
  paths: string[]
  pending: boolean
}

/** Snapshot of unpushed sim export dirty (gen ahead and/or path/structural marks). */
export function readzedcafeexportpendingdirty(): ZEDCAFE_EXPORT_PENDING_DIRTY {
  const pending =
    exportdirtygen !== exportackgen ||
    structuraldirty ||
    dirtypaths.size > 0
  return {
    structural: structuraldirty,
    paths: [...dirtypaths],
    pending,
  }
}

/** Page (or book/flags) prefix used to protect sibling paths on the same codepage. */
export function readzedcafeexportpageprefix(path: string): string | undefined {
  const segs = path.split('/')
  if (segs.length < 2 || segs[0] === 'stats.json') {
    return undefined
  }
  if (segs[1] === 'flags') {
    return `${segs[0]}/flags/`
  }
  return `${segs[0]}/${segs[1]}/`
}

/**
 * True when guest import must not apply `path` because sim has unpushed dirty
 * covering that path (exact, page-prefix, or full structural dirty).
 */
export function iszedcafeexportpathsimdirty(
  path: string,
  pending: Pick<ZEDCAFE_EXPORT_PENDING_DIRTY, 'structural' | 'paths'>,
): boolean {
  if (pending.structural) {
    return true
  }
  const dirties = pending.paths
  if (dirties.length === 0) {
    return false
  }
  for (let i = 0; i < dirties.length; ++i) {
    const dirty = dirties[i]
    if (dirty === path) {
      return true
    }
    const prefix = readzedcafeexportpageprefix(dirty)
    if (prefix && (path === prefix.slice(0, -1) || path.startsWith(prefix))) {
      return true
    }
    const pathprefix = readzedcafeexportpageprefix(path)
    if (
      pathprefix &&
      (dirty === pathprefix.slice(0, -1) || dirty.startsWith(pathprefix))
    ) {
      return true
    }
  }
  return false
}

/** Drop guest upsert/remove paths that collide with pending sim export dirty. */
export function filterzedcafeexportpathsagainstsimdirty(
  paths: Iterable<string>,
  pending: Pick<ZEDCAFE_EXPORT_PENDING_DIRTY, 'structural' | 'paths'>,
): { keep: string[]; skipped: string[] } {
  const keep: string[] = []
  const skipped: string[] = []
  for (const path of paths) {
    if (iszedcafeexportpathsimdirty(path, pending)) {
      skipped.push(path)
    } else {
      keep.push(path)
    }
  }
  return { keep, skipped }
}

export function clearzedcafeexportshadow() {
  clearlasthostpushdoc()
}

export function markzedcafeexportstructuraldirty() {
  structuraldirty = true
  bumpdirtygen()
}

export function markzedcafeexportpathdirty(path: string) {
  dirtypaths.add(path)
  bumpdirtygen()
}

function findboardpageforboundary(
  boundary: string,
): { book: BOOK; page: CODE_PAGE } | undefined {
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    for (let j = 0; j < book.pages.length; ++j) {
      const page = book.pages[j]
      if (page.id === boundary) {
        return { book, page }
      }
      const pagejson = memoryexportcodepageasjson(page)
      const board = pagejson?.board as { id?: string } | undefined
      if (board?.id === boundary) {
        return { book, page }
      }
    }
  }
  return undefined
}

/** Conservative dirty feed from root memory RFC 6902 ops. */
export function markzedcafeexportfromrootops(ops: Operation[]) {
  if (ops.length === 0) {
    return
  }
  markzedcafeexportstructuraldirty()
}

/** Conservative dirty feed from boundary RFC 6902 ops. */
export function markzedcafeexportfromboundaryops(
  boundary: string,
  ops: Operation[],
) {
  if (ops.length === 0) {
    return
  }
  let terrainonly = true
  for (let i = 0; i < ops.length; ++i) {
    const parts = decodezedcafejsonpointer(ops[i].path)
    if (parts[0] !== 'terrain') {
      terrainonly = false
      break
    }
  }
  const resolved = findboardpageforboundary(boundary)
  if (terrainonly && resolved) {
    markzedcafeexportpathdirty(
      `${readzedcafepageprefix(resolved.book, resolved.page)}/board/terrain.json`,
    )
    return
  }
  markzedcafeexportstructuraldirty()
}

/** Advance ack generation after iframe sync success for an in-flight build. */
export function acknowledgezedcafeexportpush() {
  bumpexportrevision()
  if (inflightbuildgen > 0) {
    exportackgen = inflightbuildgen
    inflightbuildgen = 0
  }
  if (exportdirtygen === exportackgen) {
    structuraldirty = false
    dirtypaths.clear()
  }
}

/**
 * Tiered coalesce window: a single dirty path flushes immediately, terrain-only
 * dirty (any count) gets a short window, everything else (structural rebuild)
 * keeps the wider structural window.
 */
function readzedcafeexportcoalescems(): number {
  if (structuraldirty || dirtypaths.size === 0) {
    return WANIX_ZEDCAFE_EXPORT_COALESCE_MS
  }
  if (dirtypaths.size === 1) {
    return WANIX_ZEDCAFE_EXPORT_COALESCE_SINGLE_MS
  }
  for (const path of dirtypaths) {
    if (!path.endsWith('/board/terrain.json')) {
      return WANIX_ZEDCAFE_EXPORT_COALESCE_MS
    }
  }
  return WANIX_ZEDCAFE_EXPORT_COALESCE_TERRAIN_MS
}

/**
 * End of tick: O(1) gate, tiered coalesce, path-doc compare, encode changed only.
 */
export function checkzedcafeexportontick(device: DEVICELIKE) {
  if (!readzedcafepollactive() || exportinflight) {
    return
  }
  if (readzedcafeguestdirty()) {
    return
  }
  if (readpendingsync()) {
    return
  }
  if (
    exportdirtygen === exportackgen &&
    !structuraldirty &&
    dirtypaths.size === 0
  ) {
    return
  }
  const now = wanixperfnow()
  const coalescems = readzedcafeexportcoalescems()
  if (lastflushms > 0 && now - lastflushms < coalescems) {
    return
  }

  const buildgen = exportdirtygen
  const buildstart = wanixperfnow()
  let nextdoc: Record<string, unknown>
  if (structuraldirty || dirtypaths.size === 0) {
    nextdoc = buildzedcafeexportdoc()
  } else {
    nextdoc = { ...readlasthostpushdoc() }
    const ok = rebuildzedcafeexportpaths(nextdoc, dirtypaths)
    if (!ok) {
      nextdoc = buildzedcafeexportdoc()
      structuraldirty = true
    }
  }
  const buildms = wanixperfdelta(buildstart).elapsedms

  const comparestart = wanixperfnow()
  const ops = compare(readlasthostpushdoc(), nextdoc)
  const comparems = wanixperfdelta(comparestart).elapsedms
  if (ops.length === 0) {
    exportackgen = buildgen
    structuraldirty = false
    dirtypaths.clear()
    lastflushms = now
    wanixperfmark('export-check-noop', { buildms, comparems, buildgen })
    return
  }

  const upsertpaths = readzedcafeexportupsertpaths(ops)
  const removepaths = [...readzedcafeexportremovepaths(ops)]
  const encodestart = wanixperfnow()
  const subset = zedcafeexportdoctofiles(nextdoc, upsertpaths)
  assertzedcafeexportvalid(subset, { partial: true })
  const encodems = wanixperfdelta(encodestart).elapsedms
  if (subset.length === 0 && removepaths.length === 0) {
    exportackgen = buildgen
    structuraldirty = false
    dirtypaths.clear()
    lastflushms = now
    return
  }

  wanixperfmark('export-check', {
    buildms,
    comparems,
    encodems,
    upserts: subset.length,
    removes: removepaths.length,
    structural: structuraldirty,
    buildgen,
  })

  exportinflight = true
  inflightbuildgen = buildgen
  lastflushms = now
  const player = memoryreadoperator()
  // partial: true here lets pushzedcafesynctoiframe take its guesttree-clean
  // fast path (skip the guest tree read/diff round trip) when the guest
  // hasn't written anything since the last sync — see pushzedcafesynctoiframe.
  void import('zss/device/wanixclient/wanixzedcafe')
    .then(({ pushzedcafesynctoiframe }) =>
      pushzedcafesynctoiframe(device, player, subset, {
        partial: true,
        nextdoc,
        removepaths,
      }),
    )
    .finally(() => {
      exportinflight = false
    })
}

export function resetwanixstateexportfortest() {
  exportinflight = false
  exportdirtygen = 0
  exportackgen = 0
  exportrevision = 0
  structuraldirty = true
  dirtypaths.clear()
  lastflushms = 0
  inflightbuildgen = 0
  clearzedcafeexportshadow()
}

/** Test helper: clear pending dirty without rebuilding the export shadow. */
export function clearzedcafeexportpendingdirtyfortest() {
  exportackgen = exportdirtygen
  structuraldirty = false
  dirtypaths.clear()
}

/** Test helper: force coalesce window open. */
export function forcezedcafeexportcoalesceopenfortest() {
  lastflushms = 0
}

/** Test helper: force coalesce window closed (need wait / reopen). */
export function forcezedcafeexportcoalesceclosedfortest() {
  lastflushms = wanixperfnow()
}

/** Test helper: read dirty generation state. */
export function readzedcafeexportdirtygensfortest() {
  return {
    dirty: exportdirtygen,
    ack: exportackgen,
    structural: structuraldirty,
    paths: [...dirtypaths],
  }
}
