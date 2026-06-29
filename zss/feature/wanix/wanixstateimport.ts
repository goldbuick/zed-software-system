import type { DEVICELIKE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import {
  kebabcasezedcafedirname,
} from 'zss/feature/wanix/zedcafetreeschema'
import type { WANIX_ZED_CAFE_EXPORT_FILE } from 'zss/feature/wanix/wanixstateexport'
import {
  memoryimportbookfromjson,
  memoryupsertcodepage,
} from 'zss/memory/bookoperations'
import { memoryreadbooklist, memorywritebook } from 'zss/memory/session'
import { ispresent } from 'zss/mapping/types'
import type { BOOK } from 'zss/memory/types'

export type WANIX_ZED_CAFE_PARSED_PAGE = {
  id: string
  code: string
  board?: Record<string, unknown>
  object?: Record<string, unknown>
  terrain?: Record<string, unknown>
  charset?: Record<string, unknown>
  palette?: Record<string, unknown>
}

export type WANIX_ZED_CAFE_PARSED_BOOK = {
  id: string
  name: string
  token: string
  timestamp: number
  activelist: string[]
  flags: Record<string, unknown>
  pages: WANIX_ZED_CAFE_PARSED_PAGE[]
}

export type WANIX_ZED_CAFE_PARSED = {
  exportedAt?: string
  guestTouch?: boolean
  books: WANIX_ZED_CAFE_PARSED_BOOK[]
}

const decoder = new TextDecoder()

function decodejson(bytes: Uint8Array): unknown {
  return JSON.parse(decoder.decode(bytes))
}

function buildindex(files: WANIX_ZED_CAFE_EXPORT_FILE[]): Map<string, Uint8Array> {
  const index = new Map<string, Uint8Array>()
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]!
    index.set(file.path, file.bytes)
  }
  return index
}

function parsejsonfile(
  index: Map<string, Uint8Array>,
  path: string,
): unknown | undefined {
  const bytes = index.get(path)
  if (!bytes) {
    return undefined
  }
  return decodejson(bytes)
}

export function assembleboardjson(
  index: Map<string, Uint8Array>,
  prefix: string,
): Record<string, unknown> | undefined {
  const statspath = `${prefix}/board/stats.json`
  const terrainpath = `${prefix}/board/terrain.json`
  const objectprefix = `${prefix}/board/objects/`
  const statsbytes = index.get(statspath)
  const terrainbytes = index.get(terrainpath)
  const objects: Record<string, unknown> = {}
  for (const [path, bytes] of index) {
    if (!path.startsWith(objectprefix) || !path.endsWith('.json')) {
      continue
    }
    const objid = path.slice(objectprefix.length, -'.json'.length)
    objects[objid] = decodejson(bytes)
  }
  if (!statsbytes && !terrainbytes && Object.keys(objects).length === 0) {
    return undefined
  }
  const board: Record<string, unknown> = {}
  if (statsbytes) {
    Object.assign(board, decodejson(statsbytes))
  }
  if (terrainbytes) {
    board.terrain = decodejson(terrainbytes)
  }
  if (Object.keys(objects).length > 0) {
    board.objects = objects
  }
  return board
}

export function assemblecodepagejson(
  index: Map<string, Uint8Array>,
  pageprefix: string,
): WANIX_ZED_CAFE_PARSED_PAGE | undefined {
  const prefix = pageprefix
  const stats = parsejsonfile(index, `${prefix}/stats.json`) as
    | {
        id?: string
        code?: string
      }
    | undefined
  if (!ispresent(stats)) {
    return undefined
  }
  const pageid = stats.id ?? prefix.split('/').pop() ?? ''
  const wire: WANIX_ZED_CAFE_PARSED_PAGE = {
    id: pageid,
    code: stats.code ?? '',
  }
  const board = assembleboardjson(index, prefix)
  if (board) {
    wire.board = board
  }
  const object = parsejsonfile(index, `${prefix}/object/element.json`)
  if (object) {
    wire.object = object as Record<string, unknown>
  }
  const terrain = parsejsonfile(index, `${prefix}/terrain/element.json`)
  if (terrain) {
    wire.terrain = terrain as Record<string, unknown>
  }
  const charset = parsejsonfile(index, `${prefix}/charset/bitmap.json`)
  if (charset) {
    wire.charset = charset as Record<string, unknown>
  }
  const palette = parsejsonfile(index, `${prefix}/palette/bitmap.json`)
  if (palette) {
    wire.palette = palette as Record<string, unknown>
  }
  return wire
}

export function parsezedcafeexportfiles(
  files: WANIX_ZED_CAFE_EXPORT_FILE[],
): WANIX_ZED_CAFE_PARSED {
  const index = buildindex(files)
  const rootstats = parsejsonfile(index, 'stats.json') as
    | {
        exportedAt?: string
        guestTouch?: boolean
        books?: { id: string; name?: string }[]
      }
    | undefined
  const books: WANIX_ZED_CAFE_PARSED_BOOK[] = []
  const bookrefs = rootstats?.books ?? []
  for (let i = 0; i < bookrefs.length; ++i) {
    const bookref = bookrefs[i]!
    const bookid = bookref.id
    const bookdirname = kebabcasezedcafedirname(bookref.name, bookid)
    const bookmeta = parsejsonfile(index, `books/${bookdirname}/stats.json`) as
      | {
          id?: string
          name?: string
          token?: string
          timestamp?: number
          activelist?: string[]
          flags?: Record<string, unknown>
          pages?: { id: string; name?: string }[]
        }
      | undefined
    if (!ispresent(bookmeta)) {
      continue
    }
    const pages: WANIX_ZED_CAFE_PARSED_PAGE[] = []
    const pagerefs = bookmeta.pages ?? []
    for (let j = 0; j < pagerefs.length; ++j) {
      const pageref = pagerefs[j]!
      const pageid = pageref.id
      const pagedirname = kebabcasezedcafedirname(pageref.name, pageid)
      const pageprefix = `books/${bookdirname}/pages/${pagedirname}`
      const page = assemblecodepagejson(index, pageprefix)
      if (page) {
        pages.push(page)
      }
    }
    books.push({
      id: bookmeta.id ?? bookid,
      name: bookmeta.name ?? bookid,
      token: bookmeta.token ?? '',
      timestamp: bookmeta.timestamp ?? 0,
      activelist: bookmeta.activelist ?? [],
      flags: bookmeta.flags ?? {},
      pages,
    })
  }
  return {
    exportedAt: rootstats?.exportedAt,
    guestTouch: rootstats?.guestTouch,
    books,
  }
}

function readbookbyid(bookid: string): BOOK | undefined {
  const books = memoryreadbooklist()
  for (let i = 0; i < books.length; ++i) {
    if (books[i]!.id === bookid) {
      return books[i]
    }
  }
  return undefined
}

function applybookmeta(book: BOOK, flat: WANIX_ZED_CAFE_PARSED_BOOK) {
  book.name = flat.name
  book.token = flat.token
  book.timestamp = flat.timestamp
  book.activelist = flat.activelist
}

export function applyzedcafetomemory(parsed: WANIX_ZED_CAFE_PARSED): boolean {
  let changed = false
  for (let i = 0; i < parsed.books.length; ++i) {
    const flat = parsed.books[i]!
    let book = readbookbyid(flat.id)
    if (!book) {
      const imported = memoryimportbookfromjson(flat)
      if (imported) {
        memorywritebook(imported)
        changed = true
      }
      continue
    }
    applybookmeta(book, flat)
    for (let j = 0; j < flat.pages.length; ++j) {
      if (memoryupsertcodepage(book, flat.pages[j]!)) {
        changed = true
      }
    }
  }
  if (parsed.guestTouch) {
    changed = true
  }
  return changed
}

export async function logzedcafeimportresult(
  device: DEVICELIKE,
  player: string,
  parsed: WANIX_ZED_CAFE_PARSED,
  changed: boolean,
) {
  if (!changed) {
    apilog(device, player, 'zed-cafe import: guest tree matched memory (no diff)')
    return
  }
  apilog(
    device,
    player,
    `zed-cafe import: synced ${parsed.books.length} book(s) from guest tree`,
  )
}
