import { isfilenamesafeid } from 'zss/mapping/guid'
import {
  readcoolregionsbowbookexport,
  readcoolregionsbowbooks,
} from 'ops/lib/coolregionsbowbook'
import { COOLREGIONSBOW_BOOK_JSON_PATH } from 'ops/lib/fixturepaths'

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
})
