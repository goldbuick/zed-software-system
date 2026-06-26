import type { DEVICELIKE } from 'zss/device/api'
import { wanixexportstate, wanixrequestzedcafeexport } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { WANIX_ZED_CAFE_EXPORT_DEBOUNCE_MS } from 'zss/feature/wanix/wanixzedcafeconstants'
import { memoryexportbookasjson } from 'zss/memory/bookoperations'
import { memoryexportcodepageasjson } from 'zss/memory/codepageoperations'
import { memoryreadbooklist } from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'

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

export function buildzedcafemanifest(books: BOOK[]) {
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

export function buildzedcafeexportfiles(): WANIX_ZED_CAFE_EXPORT_FILE[] {
  const books = memoryreadbooklist()
  const files: WANIX_ZED_CAFE_EXPORT_FILE[] = []

  files.push({
    path: 'manifest.json',
    bytes: encodejson(buildzedcafemanifest(books)),
  })

  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    const bookjson = memoryexportbookasjson(book)
    if (bookjson === undefined) {
      continue
    }
    files.push({
      path: `books/${book.id}/book.json`,
      bytes: encodejson(bookjson),
    })
    for (let j = 0; j < book.pages.length; ++j) {
      const page = book.pages[j]
      const pagejson = memoryexportcodepageasjson(page)
      if (pagejson === undefined) {
        continue
      }
      files.push({
        path: `books/${book.id}/pages/${page.id}.json`,
        bytes: encodejson(pagejson),
      })
    }
  }

  return files
}

export function runzedcafeexport(device: DEVICELIKE, player: string) {
  const payload: WANIX_ZED_CAFE_EXPORT_PAYLOAD = {
    files: buildzedcafeexportfiles(),
  }
  wanixexportstate(device, player, payload)
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
