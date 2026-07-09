import type { DEVICELIKE } from 'zss/device/api'
import { apilog, wanixexportstate } from 'zss/device/api'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { WANIX_ZEDCAFE_EXPORT_DEBOUNCE_MS } from 'zss/feature/wanix/wanixzedcafeconstants'
import { readzedcafepollactive } from 'zss/feature/wanix/wanixzedcafesession'
import {
  assertzedcafeexportvalid,
  readzedcafebookstatspath,
  readzedcafepageprefix,
  validatezedcafeexportpaths,
} from 'zss/feature/wanix/zedcafetreeschema'
import { ispresent } from 'zss/mapping/types'
import { memoryreadbookflags } from 'zss/memory/bookoperations'
import {
  memoryexportcodepageasjson,
  memoryreadcodepagename,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import {
  memoryreadbooklist,
  memoryreadoperator,
  memoryreadroot,
} from 'zss/memory/session'
import type { BOOK, CODE_PAGE } from 'zss/memory/types'

const zedcafebookspipe = createjsonpipe<Record<string, BOOK>>(
  {},
  memoryrootshouldemitpath,
)

export type WANIX_ZED_CAFE_EXPORT_FILE = {
  path: string
  bytes: Uint8Array
}

export type WANIX_ZED_CAFE_EXPORT_PAYLOAD = {
  files: WANIX_ZED_CAFE_EXPORT_FILE[]
}

const encoder = new TextEncoder()

let debouncetimer: ReturnType<typeof setTimeout> | undefined

function encodetext(text: string): Uint8Array {
  return encoder.encode(text)
}

function encodejson(value: unknown): Uint8Array {
  return encodetext(`${JSON.stringify(value, null, 2)}\n`)
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

export function readexporthasbooktree(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): boolean {
  return files.some((file) => file.path.startsWith('books/'))
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

export function runzedcafeexport(device: DEVICELIKE, player: string) {
  const files = buildzedcafeexportfiles()
  const check = validatezedcafeexportpaths(files)
  if (!check.ok) {
    const detail = check.errors[0] ?? 'unknown'
    apilog(device, player, `zedcafe export: invalid tree — ${detail}`)
    console.error(`zedcafe export: invalid tree — ${detail}`)
    return
  }
  wanixexportstate(device, player, { files })
}

export function schedulewanixexport(device: DEVICELIKE, player: string) {
  if (debouncetimer) {
    clearTimeout(debouncetimer)
  }
  debouncetimer = setTimeout(() => {
    debouncetimer = undefined
    runzedcafeexport(device, player)
  }, WANIX_ZEDCAFE_EXPORT_DEBOUNCE_MS)
}

export function primezedcafeexportshadow() {
  zedcafebookspipe.applyfullsync(memoryreadroot().books)
}

export function checkzedcafeexportontick(device: DEVICELIKE) {
  if (!readzedcafepollactive()) {
    return
  }
  const operations = zedcafebookspipe.emitdiff(memoryreadroot().books)
  if (operations.length === 0) {
    return
  }
  schedulewanixexport(device, memoryreadoperator())
}

export function resetwanixstateexportfortest() {
  if (debouncetimer) {
    clearTimeout(debouncetimer)
    debouncetimer = undefined
  }
  primezedcafeexportshadow()
}
