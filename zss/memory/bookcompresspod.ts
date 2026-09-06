/**
 * Compress worker input: JSON POD book trees from MEMORY.
 * Worker (or in-process fallback) finishes export — stringify or FORMAT_OBJECT
 * msgpack+zstd. Browser wire stays FORMAT_OBJECT (same as memoryexportbook).
 */
import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
} from 'zss/feature/format'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { bookzstdcompressbase64url } from 'zss/memory/bookzstd'
import {
  applyexportidremap,
  buildexportidremap,
} from 'zss/memory/exportidremap'
import { trimformatobject } from 'zss/memory/trimexport'
import {
  BITMAP_KEYS,
  BOARD_ELEMENT_KEYS,
  BOARD_KEYS,
  BOOK_KEYS,
  CODE_PAGE_KEYS,
} from 'zss/memory/types'
import { pack } from 'msgpackr'

export type MEMORY_BOOKS_POD_ENVELOPE = {
  main?: string
  books: unknown[]
}

export type BOOK_COMPRESS_MODE = 'json' | 'zstd'

function isalreadyformatobject(value: unknown): value is FORMAT_OBJECT {
  return Array.isArray(value) && value.length > 0 && value.length % 2 === 0
}

function formatboardelementpod(el: unknown): MAYBE<FORMAT_OBJECT> {
  if (!ispresent(el)) {
    return undefined
  }
  if (isalreadyformatobject(el)) {
    return el
  }
  const element = el as Record<string, unknown>
  if (ispresent(element.id)) {
    return formatobject(element, BOARD_ELEMENT_KEYS, {
      runtime: FORMAT_SKIP,
      stopped: FORMAT_SKIP,
      bucket: FORMAT_SKIP,
    })
  }
  return formatobject(element, BOARD_ELEMENT_KEYS, {
    id: FORMAT_SKIP,
    x: FORMAT_SKIP,
    y: FORMAT_SKIP,
    lx: FORMAT_SKIP,
    ly: FORMAT_SKIP,
    code: FORMAT_SKIP,
    runtime: FORMAT_SKIP,
    stopped: FORMAT_SKIP,
    removed: FORMAT_SKIP,
    bucket: FORMAT_SKIP,
  })
}

function formatbitmappod(bitmap: unknown): MAYBE<FORMAT_OBJECT> {
  if (!ispresent(bitmap)) {
    return undefined
  }
  if (isalreadyformatobject(bitmap)) {
    return bitmap
  }
  return formatobject(bitmap, BITMAP_KEYS, {
    bits: (bits: Uint8Array | number[]) =>
      bits instanceof Uint8Array ? Array.from(bits) : bits,
  })
}

function formatboardpod(board: unknown): MAYBE<FORMAT_OBJECT> {
  if (!ispresent(board)) {
    return undefined
  }
  if (isalreadyformatobject(board)) {
    return board
  }
  return formatobject(board, BOARD_KEYS, {
    terrain: (terrain: unknown[]) =>
      (terrain ?? []).map(formatboardelementpod),
    objects: (elements: unknown) => {
      const list = Array.isArray(elements)
        ? elements
        : Object.values((elements as Record<string, unknown>) ?? {})
      return list
        .filter((item) => {
          const el = item as { removed?: unknown } | null
          return ispresent(el) && !el.removed
        })
        .map(formatboardelementpod)
    },
    id: FORMAT_SKIP,
    name: FORMAT_SKIP,
    runtime: FORMAT_SKIP,
  })
}

function formatcodepagepod(page: unknown): MAYBE<FORMAT_OBJECT> {
  if (!ispresent(page)) {
    return undefined
  }
  if (isalreadyformatobject(page)) {
    return page
  }
  return formatobject(page, CODE_PAGE_KEYS, {
    board: formatboardpod,
    object: formatboardelementpod,
    terrain: formatboardelementpod,
    charset: formatbitmappod,
    palette: formatbitmappod,
    stats: FORMAT_SKIP,
  })
}

/** Convert one memoryexportbookasjson tree to FORMAT_OBJECT (URL wire shape). */
export function bookpodtoformatobject(pod: unknown): MAYBE<FORMAT_OBJECT> {
  if (!ispresent(pod) || typeof pod !== 'object') {
    return undefined
  }
  if (isalreadyformatobject(pod)) {
    const trimmed = trimformatobject(pod)
    if (trimmed) {
      applyexportidremap(trimmed, buildexportidremap(trimmed))
    }
    return trimmed
  }
  const book = pod as { pages?: unknown[] }
  const pagesout: FORMAT_OBJECT[] = []
  const pages = Array.isArray(book.pages) ? book.pages : []
  for (let i = 0; i < pages.length; ++i) {
    const formatted = formatcodepagepod(pages[i])
    if (ispresent(formatted)) {
      pagesout.push(formatted)
    }
  }
  const formatted = formatobject(
    { ...(book as object), pages: pagesout },
    BOOK_KEYS,
  )
  if (!ispresent(formatted)) {
    return undefined
  }
  applyexportidremap(formatted, buildexportidremap(formatted))
  return trimformatobject(formatted)
}

function packpodenvelopeaszstdbytes(
  envelope: MEMORY_BOOKS_POD_ENVELOPE,
): Uint8Array {
  const exported: FORMAT_OBJECT[] = []
  for (let i = 0; i < envelope.books.length; ++i) {
    const book = bookpodtoformatobject(envelope.books[i])
    if (book) {
      exported.push(book)
    }
  }
  const bin = pack({ main: envelope.main, books: exported })
  return bin instanceof Uint8Array ? bin : new Uint8Array(bin)
}

/** Shared by compress worker and Jest/in-process fallback. */
export async function compressbookspodenvelope(
  envelope: MEMORY_BOOKS_POD_ENVELOPE,
  mode: BOOK_COMPRESS_MODE,
): Promise<string> {
  if (mode === 'json') {
    return JSON.stringify(envelope)
  }
  return bookzstdcompressbase64url(packpodenvelopeaszstdbytes(envelope))
}
