import type { DEVICELIKE } from 'zss/device/api'
import { apilog, wanixexportstate, wanixrequestzedcafeexport } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  assertzedcafeexportvalid,
  readzedcafebookstatspath,
  readzedcafepageprefix,
  validatezedcafeexportpaths,
} from 'zss/feature/wanix/zedcafetreeschema'
import { WANIX_ZED_CAFE_EXPORT_DEBOUNCE_MS } from 'zss/feature/wanix/wanixzedcafeconstants'
import { readzedcafeimportsuppressingexport } from 'zss/feature/wanix/wanixzedcafesession'
import { memoryreadbookflags } from 'zss/memory/bookoperations'
import {
  memoryexportcodepageasjson,
  memoryreadcodepagename,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memoryreadbooklist } from 'zss/memory/session'
import { ispresent } from 'zss/mapping/types'
import type { BOOK, CODE_PAGE } from 'zss/memory/types'

export type WANIX_ZED_CAFE_EXPORT_FILE = {
  path: string
  bytes: Uint8Array
}

export type WANIX_ZED_CAFE_EXPORT_PAYLOAD = {
  files: WANIX_ZED_CAFE_EXPORT_FILE[]
}

const encoder = new TextEncoder()

let debouncetimer: ReturnType<typeof setTimeout> | undefined
let pendingwhileidle = false

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

export function buildzedcafebookmeta(book: BOOK) {
  const flagsout: Record<string, unknown> = {}
  const names = Object.keys(book.flags ?? {})
  for (let i = 0; i < names.length; ++i) {
    const name = names[i]!
    flagsout[name] = memoryreadbookflags(book, name)
  }
  const pages: { id: string; type: string; name: string | undefined }[] = []
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]!
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
      const [objid, obj] = entries[i]!
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
    const boardfiles = splitboardexport(pagejson.board as Record<string, unknown>)
    for (let i = 0; i < boardfiles.length; ++i) {
      const file = boardfiles[i]!
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
    const book = books[i]!
    files.push({
      path: readzedcafebookstatspath(book),
      bytes: encodejson(buildzedcafebookmeta(book)),
    })
    for (let j = 0; j < book.pages.length; ++j) {
      const pagefiles = buildzedcafecodepagefiles(book, book.pages[j]!)
      for (let k = 0; k < pagefiles.length; ++k) {
        files.push(pagefiles[k]!)
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
    apilog(
      device,
      player,
      `zed-cafe export: invalid tree — ${check.errors[0] ?? 'unknown'}`,
    )
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
  }, WANIX_ZED_CAFE_EXPORT_DEBOUNCE_MS)
}

export function requestzedcafeexportonwarm(device: DEVICELIKE, player: string) {
  if (pendingwhileidle) {
    pendingwhileidle = false
  }
  wanixrequestzedcafeexport(device, player)
}

export function markzedcafeexportpendingwhileidle() {
  pendingwhileidle = true
}

export function readzedcafeexportpendingwhileidle(): boolean {
  return pendingwhileidle
}

export function notifyzedcafebookschanged(player: string) {
  if (readzedcafeimportsuppressingexport()) {
    return
  }
  schedulewanixexport(SOFTWARE, player)
}

/** Test hook — reset debounce + pending flags. */
export function resetwanixstateexportfortest() {
  if (debouncetimer) {
    clearTimeout(debouncetimer)
    debouncetimer = undefined
  }
  pendingwhileidle = false
}
