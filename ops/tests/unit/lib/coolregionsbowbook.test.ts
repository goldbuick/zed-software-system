import { isfilenamesafeid } from 'zss/mapping/guid'
import { memoryimportbookfromjson } from 'zss/memory/bookoperations'
import { memoryreadcodepageruntime } from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import {
  readcoolregionsbowbookexport,
  readcoolregionsbowbooks,
} from 'ops/lib/coolregionsbowbook'
import { COOLREGIONSBOW_BOOK_JSON_PATH } from 'ops/lib/fixturepaths'

/** First terrain cell that omits display fields (kind defaults stripped). */
function findstrippedcell(book: any) {
  for (let p = 0; p < book.pages.length; ++p) {
    const terrain = book.pages[p].board?.terrain
    if (!Array.isArray(terrain)) {
      continue
    }
    for (let i = 0; i < terrain.length; ++i) {
      const cell = terrain[i]
      if (
        cell &&
        cell.kind &&
        cell.char === undefined &&
        cell.color === undefined &&
        cell.bg === undefined
      ) {
        return { page: p, index: i, kind: cell.kind }
      }
    }
  }
  return undefined
}

describe('coolregionsbow book fixture', () => {
  it('loads exported book json from repo fixtures', () => {
    const exp = readcoolregionsbowbookexport()
    expect(exp.data.name).toBe('coolregionsbow')
    expect(exp.data.pages.length).toBeGreaterThan(0)
  })

  it('readcoolregionsbowbooks returns a single-book array', () => {
    const books = readcoolregionsbowbooks()
    expect(books).toHaveLength(1)
    expect(books[0]?.name).toBe('coolregionsbow')
  })

  it('COOLREGIONSBOW_BOOK_JSON_PATH points at the fixture file', () => {
    expect(COOLREGIONSBOW_BOOK_JSON_PATH).toContain(
      'example-coolregionsbow.book.json',
    )
  })

  it('book, page, and object ids are filename-safe', () => {
    const book = readcoolregionsbowbookexport().data
    expect(isfilenamesafeid(book.id)).toBe(true)
    for (const page of book.pages) {
      expect(isfilenamesafeid(page.id)).toBe(true)
      const objects = page.board?.objects
      if (!objects || typeof objects !== 'object') {
        continue
      }
      for (const [key, obj] of Object.entries(objects)) {
        expect(isfilenamesafeid(key)).toBe(true)
        if (obj && typeof obj === 'object' && 'id' in obj && obj.id) {
          expect(isfilenamesafeid(String(obj.id))).toBe(true)
        }
      }
    }
    if (book.flags && typeof book.flags === 'object') {
      for (const owner of Object.keys(book.flags)) {
        expect(isfilenamesafeid(owner)).toBe(true)
      }
    }
  })

  it('has no terrainmap or dmap and strips kind-default display fields', () => {
    const book = readcoolregionsbowbookexport().data as any
    expect(book.terrainmap).toBeUndefined()

    let stripped = 0
    let withoverride = 0
    for (const page of book.pages) {
      const terrain = page.board?.terrain
      if (!Array.isArray(terrain)) {
        continue
      }
      for (const cell of terrain) {
        if (!cell) {
          continue
        }
        expect(cell.dmap).toBeUndefined()
        if (
          cell.char === undefined &&
          cell.color === undefined &&
          cell.bg === undefined
        ) {
          stripped += 1
        } else {
          withoverride += 1
        }
      }
    }
    expect(stripped).toBeGreaterThan(0)
    expect(withoverride).toBeGreaterThan(0)
  })

  it('imports stripped cells and resolves kind display', () => {
    const sample = findstrippedcell(readcoolregionsbowbookexport().data as any)
    expect(sample).toBeDefined()

    const book = memoryimportbookfromjson(readcoolregionsbowbookexport().data)
    expect(book).toBeDefined()
    memoryresetbooks([book!])

    const board = memoryreadcodepageruntime(book!.pages[sample!.page])?.board
    const cell = board?.terrain[sample!.index]
    expect(cell?.kind).toBe(sample!.kind)
    expect(cell?.dmap).toBeUndefined()
    memoryresetbooks([])
  })
})
