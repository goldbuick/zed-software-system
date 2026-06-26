import {
  COOLREGIONSBOW_BOOK_JSON_PATH,
  readcoolregionsbowbookexport,
  readcoolregionsbowbooks,
} from 'ops/lib/coolregionsbowbook'

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
})
