import type { Operation } from 'fast-json-patch'
import { compare } from 'fast-json-patch'
import type { DEVICELIKE } from 'zss/device/api'
import {
  clearlasthostpushdoc,
  readlasthostpushdoc,
  readzedcafepollactive,
  setlasthostpushdoc,
} from 'zss/device/wanixclient/state'
import {
  assertzedcafeexportvalid,
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

function encodetext(text: string): Uint8Array {
  return encoder.encode(text)
}

function encodejson(value: unknown): Uint8Array {
  return encodetext(`${JSON.stringify(value, null, 2)}\n`)
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
  const flagsout: Record<string, unknown> = {}
  const names = Object.keys(book.flags ?? {})
  for (let i = 0; i < names.length; ++i) {
    const name = names[i]
    flagsout[name] = memoryreadbookflags(book, name)
  }
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
    timestamp: book.timestamp,
    activelist: book.activelist,
    flags: flagsout,
    pages,
  }
}

export function splitboardexport(
  boardjson: Record<string, unknown>,
): WANIX_ZED_CAFE_EXPORT_FILE[] {
  const files: WANIX_ZED_CAFE_EXPORT_FILE[] = []
  const { terrain, objects, ...stats } = boardjson
  if (terrain !== undefined) {
    files.push({
      path: 'board/terrain.json',
      bytes: encodejson(terrain),
    })
  }
  if (Object.keys(stats).length > 0) {
    files.push({
      path: 'board/stats.json',
      bytes: encodejson(stats),
    })
  }
  if (ispresent(objects) && typeof objects === 'object') {
    const entries = Object.entries(objects as Record<string, unknown>)
    for (let i = 0; i < entries.length; ++i) {
      const [objid, obj] = entries[i]
      files.push({
        path: `board/objects/${objid}.json`,
        bytes: encodejson(obj),
      })
    }
  }
  return files
}

export function buildzedcafecodepagefiles(
  book: BOOK,
  page: CODE_PAGE,
): WANIX_ZED_CAFE_EXPORT_FILE[] {
  const pagejson = memoryexportcodepageasjson(page)
  if (pagejson === undefined) {
    return []
  }
  const prefix = readzedcafepageprefix(book, page)
  const files: WANIX_ZED_CAFE_EXPORT_FILE[] = []

  files.push({
    path: `${prefix}/stats.json`,
    bytes: encodejson({
      id: page.id,
      code: page.code,
      type: memoryreadcodepagetypeasstring(page),
      name: memoryreadcodepagename(page),
    }),
  })

  if (ispresent(pagejson.board)) {
    const boardfiles = splitboardexport(
      pagejson.board as Record<string, unknown>,
    )
    for (let i = 0; i < boardfiles.length; ++i) {
      const file = boardfiles[i]
      files.push({
        path: `${prefix}/${file.path}`,
        bytes: file.bytes,
      })
    }
  }
  if (ispresent(pagejson.object)) {
    files.push({
      path: `${prefix}/object/element.json`,
      bytes: encodejson(pagejson.object),
    })
  }
  if (ispresent(pagejson.terrain)) {
    files.push({
      path: `${prefix}/terrain/element.json`,
      bytes: encodejson(pagejson.terrain),
    })
  }
  if (ispresent(pagejson.charset)) {
    files.push({
      path: `${prefix}/charset/bitmap.json`,
      bytes: encodejson(pagejson.charset),
    })
  }
  if (ispresent(pagejson.palette)) {
    files.push({
      path: `${prefix}/palette/bitmap.json`,
      bytes: encodejson(pagejson.palette),
    })
  }

  return files
}

export function buildzedcafeexportfiles(): WANIX_ZED_CAFE_EXPORT_FILE[] {
  const books = memoryreadbooklist()
  const files: WANIX_ZED_CAFE_EXPORT_FILE[] = []

  files.push({
    path: 'stats.json',
    bytes: encodejson(buildzedcafestats(books)),
  })

  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    files.push({
      path: readzedcafebookstatspath(book),
      bytes: encodejson(buildzedcafebookmeta(book)),
    })
    for (let j = 0; j < book.pages.length; ++j) {
      const pagefiles = buildzedcafecodepagefiles(book, book.pages[j])
      for (let k = 0; k < pagefiles.length; ++k) {
        files.push(pagefiles[k])
      }
    }
  }

  assertzedcafeexportvalid(files)
  return files
}

/** Set last-pushed export shadow from files (or current memory export). */
export function primezedcafeexportshadow(files?: WANIX_ZED_CAFE_EXPORT_FILE[]) {
  const source = files ?? buildzedcafeexportfiles()
  setlasthostpushdoc(zedcafeexportfilestodoc(source))
}

export function clearzedcafeexportshadow() {
  clearlasthostpushdoc()
}

/**
 * End of tick: rebuild export, compare to last push shadow, upsert/remove files.
 */
export function checkzedcafeexportontick(device: DEVICELIKE) {
  if (!readzedcafepollactive() || exportinflight) {
    return
  }
  const files = buildzedcafeexportfiles()
  const nextdoc = zedcafeexportfilestodoc(files)
  const ops = compare(readlasthostpushdoc(), nextdoc)
  if (ops.length === 0) {
    return
  }
  const upsertpaths = readzedcafeexportupsertpaths(ops)
  const removepaths = [...readzedcafeexportremovepaths(ops)]
  const subset: WANIX_ZED_CAFE_EXPORT_FILE[] = []
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    if (upsertpaths.has(file.path)) {
      subset.push(file)
    }
  }
  if (subset.length === 0 && removepaths.length === 0) {
    return
  }
  exportinflight = true
  const player = memoryreadoperator()
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
  clearzedcafeexportshadow()
}
