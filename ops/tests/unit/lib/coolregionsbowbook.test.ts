import { isfilenamesafeid } from 'zss/mapping/guid'
import { memoryimportbookfromjson } from 'zss/memory/bookoperations'
import { memoryreadcodepageruntime } from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import {
  readcoolregionsbowbookexport,
  readcoolregionsbowbooks,
} from 'ops/lib/coolregionsbowbook'
import { COOLREGIONSBOW_BOOK_JSON_PATH } from 'ops/lib/fixturepaths'

/** First terrain cell that references the book terrainmap. */
function findinternedcell(book: any) {
  for (let p = 0; p < book.pages.length; ++p) {
    const terrain = book.pages[p].board?.terrain
    if (!Array.isArray(terrain)) {
      continue
    }
    for (let i = 0; i < terrain.length; ++i) {
      if (terrain[i] && terrain[i].dmap !== undefined) {
        return { page: p, index: i, entry: book.terrainmap[terrain[i].dmap] }
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

  it('terrain display is deduped into the book terrainmap', () => {
    const book = readcoolregionsbowbookexport().data as any
    expect(book.terrainmap.length).toBeGreaterThan(0)

    let interned = 0
    for (const page of book.pages) {
      const terrain = page.board?.terrain
      if (!Array.isArray(terrain)) {
        continue
      }
      for (const cell of terrain) {
        if (!cell || cell.dmap === undefined) {
          continue
        }
        interned += 1
        expect(book.terrainmap[cell.dmap]).toBeDefined()
        // interned cells must not also carry literal display stats
        expect(cell.char).toBeUndefined()
        expect(cell.color).toBeUndefined()
        expect(cell.bg).toBeUndefined()
      }
    }
    expect(interned).toBeGreaterThan(0)
  })

  it('restores terrain display from the table on import', () => {
    const sample = findinternedcell(readcoolregionsbowbookexport().data as any)
    expect(sample).toBeDefined()

    const book = memoryimportbookfromjson(readcoolregionsbowbookexport().data)
    expect(book).toBeDefined()
    memoryresetbooks([book!])

    const board = memoryreadcodepageruntime(book!.pages[sample!.page])?.board
    const cell = board?.terrain[sample!.index]
    expect(cell?.char).toBe(sample!.entry.char)
    expect(cell?.color).toBe(sample!.entry.color)
    expect(cell?.dmap).toBeUndefined()
    memoryresetbooks([])
  })
})
