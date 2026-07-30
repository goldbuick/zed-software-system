import { memoryfsshouldmirrorflagowner } from 'zss/feature/memoryfs/flagfilter'
import {
  assertmemoryfsexportvalid,
  readmemoryfsbookstatspath,
  readmemoryfsflagstatspath,
  readmemoryfspageprefix,
  type MEMORYFS_PATH_FILE,
} from 'zss/feature/memoryfs/schema'
import { ispresent } from 'zss/mapping/types'
import { memoryreadbookflags } from 'zss/memory/bookoperations'
import {
  memoryexportcodepageasjson,
  memoryreadcodepagename,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import {
  memoryreadbooklist,
  memoryreadroot,
} from 'zss/memory/session'
import type { BOOK, CODE_PAGE } from 'zss/memory/types'

const encoder = new TextEncoder()

function encodetext(text: string): Uint8Array {
  return encoder.encode(text)
}

export function memoryfsencodejson(value: unknown): Uint8Array {
  return encodetext(`${JSON.stringify(value, null, 2)}\n`)
}

export function buildmemoryfsrootstats(books: BOOK[]) {
  const root = memoryreadroot()
  return {
    software: {
      main: root.software.main,
      temp: root.software.temp,
    },
    bookCount: books.length,
    books: books.map((book) => ({
      id: book.id,
      name: book.name,
      pageCount: book.pages.length,
    })),
  }
}

/** Book meta without timestamp or inline flags. */
export function buildmemoryfsbookmeta(book: BOOK) {
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

export function splitmemoryfsboardexport(
  boardjson: Record<string, unknown>,
): MEMORYFS_PATH_FILE[] {
  const files: MEMORYFS_PATH_FILE[] = []
  const { terrain, objects, ...stats } = boardjson
  if (terrain !== undefined) {
    files.push({
      path: 'board/terrain.json',
      bytes: memoryfsencodejson(terrain),
    })
  }
  if (Object.keys(stats).length > 0) {
    files.push({
      path: 'board/stats.json',
      bytes: memoryfsencodejson(stats),
    })
  }
  if (ispresent(objects) && typeof objects === 'object') {
    const entries = Object.entries(objects as Record<string, unknown>)
    for (let i = 0; i < entries.length; ++i) {
      const [objid, obj] = entries[i]
      if (!objid) {
        continue
      }
      files.push({
        path: `board/objects/${objid}.json`,
        bytes: memoryfsencodejson(obj),
      })
    }
  }
  return files
}

export function buildmemoryfscodepagefiles(
  book: BOOK,
  page: CODE_PAGE,
): MEMORYFS_PATH_FILE[] {
  const pagejson = memoryexportcodepageasjson(page)
  if (pagejson === undefined) {
    return []
  }
  const prefix = readmemoryfspageprefix(book, page)
  const files: MEMORYFS_PATH_FILE[] = []

  files.push({
    path: `${prefix}/stats.json`,
    bytes: memoryfsencodejson({
      id: page.id,
      code: page.code,
      type: memoryreadcodepagetypeasstring(page),
      name: memoryreadcodepagename(page),
    }),
  })

  if (ispresent(pagejson.board)) {
    const boardfiles = splitmemoryfsboardexport(
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
      bytes: memoryfsencodejson(pagejson.object),
    })
  }
  if (ispresent(pagejson.terrain)) {
    files.push({
      path: `${prefix}/terrain/element.json`,
      bytes: memoryfsencodejson(pagejson.terrain),
    })
  }
  if (ispresent(pagejson.charset)) {
    files.push({
      path: `${prefix}/charset/bitmap.json`,
      bytes: memoryfsencodejson(pagejson.charset),
    })
  }
  if (ispresent(pagejson.palette)) {
    files.push({
      path: `${prefix}/palette/bitmap.json`,
      bytes: memoryfsencodejson(pagejson.palette),
    })
  }

  return files
}

export function buildmemoryfsflagfiles(book: BOOK): MEMORYFS_PATH_FILE[] {
  const files: MEMORYFS_PATH_FILE[] = []
  const owners = Object.keys(book.flags ?? {})
  for (let i = 0; i < owners.length; ++i) {
    const owner = owners[i]
    if (!memoryfsshouldmirrorflagowner(owner)) {
      continue
    }
    const flags = memoryreadbookflags(book, owner)
    files.push({
      path: readmemoryfsflagstatspath(book, owner),
      bytes: memoryfsencodejson(flags ?? {}),
    })
  }
  return files
}

export function buildmemoryfsexportfiles(): MEMORYFS_PATH_FILE[] {
  const books = memoryreadbooklist()
  const files: MEMORYFS_PATH_FILE[] = []

  files.push({
    path: 'stats.json',
    bytes: memoryfsencodejson(buildmemoryfsrootstats(books)),
  })

  for (let i = 0; i < books.length; ++i) {
    const book = books[i]
    files.push({
      path: readmemoryfsbookstatspath(book),
      bytes: memoryfsencodejson(buildmemoryfsbookmeta(book)),
    })
    const flagfiles = buildmemoryfsflagfiles(book)
    for (let f = 0; f < flagfiles.length; ++f) {
      files.push(flagfiles[f])
    }
    for (let j = 0; j < book.pages.length; ++j) {
      const pagefiles = buildmemoryfscodepagefiles(book, book.pages[j])
      for (let k = 0; k < pagefiles.length; ++k) {
        files.push(pagefiles[k])
      }
    }
  }

  assertmemoryfsexportvalid(files)
  return files
}

/** Paths that exist in `previous` but not in `next` (orphan cleanup). */
export function memoryfsorphanpaths(
  previous: string[],
  next: MEMORYFS_PATH_FILE[],
): string[] {
  const nextset = new Set(next.map((f) => f.path))
  const orphans: string[] = []
  for (let i = 0; i < previous.length; ++i) {
    const path = previous[i]
    if (!nextset.has(path)) {
      orphans.push(path)
    }
  }
  return orphans
}
