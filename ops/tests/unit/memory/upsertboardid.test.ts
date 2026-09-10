import { memoryupsertcodepage, memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryimportcodepagefromjson,
} from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'

describe('board.id restore on upsert/import', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('memoryimportcodepagefromjson sets board.id to page id', () => {
    const pageid = 'room0x1-sid_testpage'
    const page = memoryimportcodepagefromjson({
      id: pageid,
      code: '@board room0x1\n',
      board: {
        name: 'room0x1',
        terrain: [],
        objects: {},
      },
    })
    expect(page?.id).toBe(pageid)
    expect(page?.board?.id).toBe(pageid)
  })

  it('memoryupsertcodepage restores board.id when flat board omits id', () => {
    const cp = memorycreatecodepage('@board room0x1\n', {
      board: {
        id: 'will-be-replaced',
        name: 'room0x1',
        terrain: [],
        objects: {},
      },
    })
    const book = memorycreatebook([cp])
    const pageid = cp.id

    const ok = memoryupsertcodepage(book, {
      id: pageid,
      code: '@board room0x1\n',
      board: {
        name: 'room0x1',
        terrain: [{ char: 2, color: 10, bg: 0 }],
        objects: {},
      },
    })
    expect(ok).toBe(true)
    expect(cp.board?.id).toBe(pageid)
    const page = book.pages.find((p) => p.id === pageid)
    expect(page?.board?.id).toBe(pageid)
  })
})
