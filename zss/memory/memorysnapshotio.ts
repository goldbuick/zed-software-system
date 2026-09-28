/**
 * Book snapshot serialize / deserialize.
 * Called by compressspace, and directly by headless/climode and Jest.
 */
import { decompress } from '@bokuweb/zstd-wasm'
import JSZip, { JSZipObject } from 'jszip'
import { unpack } from 'msgpackr'
import { FORMAT_OBJECT, unpackformat } from 'zss/feature/format'
import { ensurezstdwasm } from 'zss/feature/zstdwasm'
import { base64urltobase64 } from 'zss/mapping/encode'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'

import { memoryexportbook, memoryimportbook } from './bookoperations'
import { collectflagprotectedids } from './exportidremap'
import { packbookwirestourl } from './packbookwires'
import { trimmemoryexport } from './trimexport'
import { BOOK } from './types'

/** Save/load payload: books plus optional opened-book id (`MEMORY.main`). */
export type MEMORY_BOOKS_BUNDLE = {
  books: BOOK[]
  main?: string
}

function base64tobytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; ++i) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function iszipbytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b
}

function memoryimportbooklist(list: unknown): BOOK[] {
  if (!Array.isArray(list)) {
    return []
  }
  const books: BOOK[] = []
  for (let i = 0; i < list.length; ++i) {
    const book = memoryimportbook(list[i] as FORMAT_OBJECT)
    if (ispresent(book)) {
      books.push(book)
    }
  }
  return books
}

function memoryimportbooklistfromjson(list: unknown): BOOK[] {
  if (!Array.isArray(list)) {
    return []
  }
  return list
    .map((entry) =>
      memoryimportbook(entry as Record<string, unknown>, {
        format: 'json',
      }),
    )
    .filter(ispresent)
}

/**
 * Export, protect cross-book ids, remap, trim, then msgpack+zstd.
 * `json` writes the climode `{ main, books }` envelope instead.
 */
export async function memoryserializesnapshot(
  snapshot: MEMORY_BOOKS_BUNDLE,
  json = false,
): Promise<string> {
  const main = snapshot.main
  const books = snapshot.books
  if (json) {
    const jsonbooks: unknown[] = []
    for (let i = 0; i < books.length; ++i) {
      const exported = trimmemoryexport(
        memoryexportbook(books[i], { format: 'json' }),
      )
      if (exported) {
        jsonbooks.push(exported)
      }
    }
    return JSON.stringify({ main, books: jsonbooks })
  }

  const wires: FORMAT_OBJECT[] = []
  for (let i = 0; i < books.length; ++i) {
    const wire = memoryexportbook(books[i], {
      noremap: true,
    }) as MAYBE<FORMAT_OBJECT>
    if (wire) {
      wires.push(wire)
    }
  }
  const protectedids = new Set<string>()
  for (let i = 0; i < wires.length; ++i) {
    const ids = collectflagprotectedids(wires[i])
    for (const id of ids) {
      protectedids.add(id)
    }
  }
  return packbookwirestourl(main, wires, Array.from(protectedids))
}

async function memorydecompressbookszip(content: string): Promise<BOOK[]> {
  const books: BOOK[] = []
  const zip = await JSZip.loadAsync(content, { base64: true })

  const files: JSZipObject[] = []
  zip.forEach((_path, file) => files.push(file))

  for (let i = 0; i < files.length; ++i) {
    const file = files[i]

    const str = await file.async('string')
    const maybebookfromstr = unpackformat(str)
    if (ispresent(maybebookfromstr)) {
      const book = memoryimportbook(maybebookfromstr)
      if (ispresent(book)) {
        books.push(book)
        continue
      }
    }

    const bin = await file.async('uint8array')
    const maybebookfrombin = unpackformat(bin)
    if (ispresent(maybebookfrombin)) {
      const book = memoryimportbook(maybebookfrombin)
      if (ispresent(book)) {
        books.push(book)
        continue
      }
    }

    const ubin = decompress(bin)
    const maybebookfromubin = unpackformat(ubin)
    if (ispresent(maybebookfromubin)) {
      const book = memoryimportbook(maybebookfromubin)
      if (ispresent(book)) {
        books.push(book)
      }
    }
  }

  return books
}

/** base64url, climode JSON, or legacy zip/json book payloads → snapshot. */
export async function memorydeserializesnapshot(
  base64bytes: string,
): Promise<MEMORY_BOOKS_BUNDLE> {
  const trimmed = base64bytes.trim()
  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(base64bytes) as unknown
    return { books: memoryimportbooklistfromjson(parsed) }
  }
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(base64bytes) as {
      main?: string
      books?: unknown
    }
    return {
      books: memoryimportbooklistfromjson(parsed.books),
      main: isstring(parsed.main) ? parsed.main : undefined,
    }
  }

  await ensurezstdwasm()

  const content = base64urltobase64(base64bytes)
  const raw = base64tobytes(content)

  // Legacy: JSZip envelope (PK..) with per-book zstd|msgpack|json entries.
  if (iszipbytes(raw)) {
    return { books: await memorydecompressbookszip(content) }
  }

  // Current: zstd(msgpack({ main?, books })) — legacy: zstd(msgpack(FORMAT_OBJECT[]))
  const ubin = decompress(raw)
  const payload = unpack(ubin) as unknown
  if (Array.isArray(payload)) {
    return { books: memoryimportbooklist(payload) }
  }
  if (payload && typeof payload === 'object') {
    const envelope = payload as { main?: unknown; books?: unknown }
    return {
      books: memoryimportbooklist(envelope.books),
      main: isstring(envelope.main) ? envelope.main : undefined,
    }
  }
  return { books: [] }
}
