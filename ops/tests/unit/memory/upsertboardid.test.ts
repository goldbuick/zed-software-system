import { memoryupsertcodepage, memorycreatebook } from 'zss/memory/bookoperations'
import { memorycollecttickboundaries } from 'zss/memory/boardwait'
import {
  memoryboundariesclear,
  memoryboundaryget,
} from 'zss/memory/boundaries'
import {
  memorycreatecodepage,
  memoryimportcodepagefromjson,
  memoryreadcodepageruntime,
} from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import type { CODE_PAGE_RUNTIME } from 'zss/memory/types'

describe('board.id restore on upsert/import', () => {
  afterEach(() => {
    memoryboundariesclear()
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
    const rt = memoryboundaryget<CODE_PAGE_RUNTIME>(pageid)
    expect(rt?.board?.id).toBe(pageid)
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
    const rt = memoryboundaryget<CODE_PAGE_RUNTIME>(pageid)
    expect(rt?.board?.id).toBe(pageid)
    expect(memoryreadcodepageruntime(cp)?.board?.id).toBe(pageid)
  })

  it('memorycollecttickboundaries includes page id after upsert without board.id', () => {
    const cp = memorycreatecodepage('@board room0x1\n', {
      board: {
        id: 'placeholder',
        name: 'room0x1',
        terrain: [],
        objects: {},
      },
    })
    const book = memorycreatebook([cp])
    const pageid = cp.id

    memoryupsertcodepage(book, {
      id: pageid,
      code: '@board room0x1\n',
      board: {
        name: 'room0x1',
        terrain: [],
        objects: {},
      },
    })

    const ids = memorycollecttickboundaries(book, [pageid])
    expect(ids).toContain(pageid)
  })
})
