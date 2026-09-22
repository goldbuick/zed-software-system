import { decompress } from '@bokuweb/zstd-wasm'
import { pack, unpack } from 'msgpackr'
import { FORMAT_OBJECT } from 'zss/feature/format'
import { ensurezstdwasm } from 'zss/feature/zstdwasm'
import { base64urltobase64 } from 'zss/mapping/encode'
import { createsid } from 'zss/mapping/guid'
import { memorycreateboard } from 'zss/memory/boardlifecycle'
import { bookzstdcompressbase64url } from 'zss/memory/bookzstd'
import {
  memorycreatebook,
  memoryexportbook,
  memorywriteflag,
} from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import {
  applyexportidremap,
  buildexportidremap,
  collectflagprotectedids,
} from 'zss/memory/exportidremap'
import { packbookwirestourl } from 'zss/memory/packbookwires'
import { memoryresetbooks } from 'zss/memory/session'
import { trimformatobject } from 'zss/memory/trimexport'
import {
  BOARD_ELEMENT_KEYS,
  BOARD_KEYS,
  BOOK_KEYS,
  CODE_PAGE_KEYS,
} from 'zss/memory/types'

function formatgetvalue(formatted: unknown, key: number): any {
  if (!Array.isArray(formatted)) {
    return undefined
  }
  for (let i = 0; i < formatted.length; i += 2) {
    if (formatted[i] === key) {
      return formatted[i + 1]
    }
  }
  return undefined
}

function base64tobytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; ++i) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function unpackurlpayload(content: string): Promise<unknown> {
  await ensurezstdwasm()
  const bytes = base64tobytes(base64urltobase64(content))
  const ubin = decompress(bytes)
  return unpack(ubin)
}

describe('packbookwirestourl', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('matches legacy remap+trim+pack+zstd for once-only object ids', async () => {
    const board = memorycreateboard()
    const solo = createsid()
    board.objects[solo] = {
      id: solo,
      kind: 'widget',
      x: 1,
      y: 1,
    }
    const book = memorycreatebook([
      memorycreatecodepage('@board room\n', { board }),
    ])
    const wire = memoryexportbook(book, { noremap: true })! as FORMAT_OBJECT
    const main = book.id
    const protectedids = Array.from(collectflagprotectedids(wire))

    const legacywire = structuredClone(wire)
    applyexportidremap(
      legacywire,
      buildexportidremap(legacywire, new Set(protectedids)),
    )
    const legacytrimmed = trimformatobject(legacywire)!
    const legacybytes = pack({ main, books: [legacytrimmed] })
    const legacy =
      legacybytes instanceof Uint8Array
        ? legacybytes
        : new Uint8Array(legacybytes)
    const expected = await bookzstdcompressbase64url(legacy)

    const got = await packbookwirestourl(
      main,
      [structuredClone(wire)],
      protectedids,
    )
    expect(got).toBe(expected)

    const payload = (await unpackurlpayload(got)) as {
      main?: string
      books?: FORMAT_OBJECT[]
    }
    expect(payload.main).toBe(main)
    const pages = formatgetvalue(payload.books![0], BOOK_KEYS.pages)
    const boardwire = formatgetvalue(pages[0], CODE_PAGE_KEYS.board)
    const objects = formatgetvalue(boardwire, BOARD_KEYS.objects) as unknown[]
    const ids = objects.map((row) =>
      formatgetvalue(row, BOARD_ELEMENT_KEYS.id),
    )
    // Page id remaps to 0; once-only object remaps to 1.
    expect(ids).toEqual([1])
  })

  it('keeps flag-protected ids across books in the protect set', async () => {
    const board = memorycreateboard()
    const oid = createsid()
    board.objects[oid] = {
      id: oid,
      kind: 'widget',
      x: 0,
      y: 0,
    }
    const booka = memorycreatebook([
      memorycreatecodepage('@board room\n', { board }),
    ])
    memorywriteflag(booka, oid, 'score', 1 as any)

    const boardb = memorycreateboard()
    const solo = createsid()
    boardb.objects[solo] = {
      id: solo,
      kind: 'widget',
      x: 2,
      y: 2,
    }
    const bookb = memorycreatebook([
      memorycreatecodepage('@board other\n', { board: boardb }),
    ])

    const wirea = memoryexportbook(booka, { noremap: true })! as FORMAT_OBJECT
    const wireb = memoryexportbook(bookb, { noremap: true })! as FORMAT_OBJECT
    const protectedids = new Set<string>()
    for (const id of collectflagprotectedids(wirea)) {
      protectedids.add(id)
    }
    for (const id of collectflagprotectedids(wireb)) {
      protectedids.add(id)
    }
    expect(protectedids.has(oid)).toBe(true)

    const got = await packbookwirestourl(
      booka.id,
      [structuredClone(wirea), structuredClone(wireb)],
      protectedids,
    )
    const payload = (await unpackurlpayload(got)) as {
      books?: FORMAT_OBJECT[]
    }
    const pagesa = formatgetvalue(payload.books![0], BOOK_KEYS.pages)
    const boardwire = formatgetvalue(pagesa[0], CODE_PAGE_KEYS.board)
    const objects = formatgetvalue(boardwire, BOARD_KEYS.objects) as unknown[]
    const objectids = objects.map((row) =>
      formatgetvalue(row, BOARD_ELEMENT_KEYS.id),
    )
    expect(objectids).toContain(oid)

    const pagesb = formatgetvalue(payload.books![1], BOOK_KEYS.pages)
    const boardwireb = formatgetvalue(pagesb[0], CODE_PAGE_KEYS.board)
    const objectsb = formatgetvalue(boardwireb, BOARD_KEYS.objects) as unknown[]
    const soloids = objectsb.map((row) =>
      formatgetvalue(row, BOARD_ELEMENT_KEYS.id),
    )
    // Page id 0, unprotected object 1 within that book wire.
    expect(soloids).toEqual([1])
  })
})
