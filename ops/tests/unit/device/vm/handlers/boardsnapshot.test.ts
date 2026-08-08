import { boardsnapshot, boardrevert } from 'zss/feature/boardsnapshot'
import { pttoindex } from 'zss/mapping/2d'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { memorywriteboardelementruntime } from 'zss/memory/runtimeboundary'
import { memoryresetbooks } from 'zss/memory/session'
import type { BOARD, BOARD_ELEMENT } from 'zss/memory/types'
import { BOARD_SIZE, BOARD_WIDTH, CODE_PAGE_TYPE } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { CATEGORY, NAME } from 'zss/words/types'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 0,
    DRAW_CHAR_HEIGHT: () => 0,
  },
}))

function makewallterrain(x: number, y: number): BOARD_ELEMENT {
  const tile: BOARD_ELEMENT = {
    x,
    y,
    kind: 'wall',
    char: 219,
    color: 2,
    runtime: '',
  }
  memorywriteboardelementruntime(tile, {
    category: CATEGORY.ISTERRAIN,
    kinddata: { id: 'wall', name: 'wall', char: 219, runtime: '' },
  })
  return tile
}

function makeboard(name: string, terrainat?: BOARD_ELEMENT): BOARD {
  const terrain = new Array<BOARD_ELEMENT | undefined>(BOARD_SIZE)
  if (terrainat) {
    terrain[
      pttoindex({ x: terrainat.x ?? 0, y: terrainat.y ?? 0 }, BOARD_WIDTH)
    ] = terrainat
  }
  return {
    id: '',
    name,
    terrain,
    objects: {},
    runtime: '',
  }
}

function setupbooks(pages: ReturnType<typeof memorycreatecodepage>[]) {
  const book = memorycreatebook(pages)
  book.name = 'main'
  memoryresetbooks([book])
  return book
}

function snapshotpagename(boardid: string) {
  return NAME(`zss_snapshot_${boardid}`)
}

describe('boardsnapshot / boardrevert', () => {
  afterEach(() => {
    memoryresetbooks([])
    READ_CONTEXT.book = undefined
  })

  it('creates MAIN snapshot page and copies terrain', () => {
    const wall = makewallterrain(0, 0)
    const currentboard = makeboard('here', wall)
    const wallcp = memorycreatecodepage('@terrain wall\n', {
      terrain: { id: 'wall', name: 'wall', kind: 'wall', runtime: '' },
    })
    const currentcp = memorycreatecodepage('@board here\n', {
      board: currentboard,
    })
    const book = setupbooks([wallcp, currentcp])
    const pagecountbefore = book.pages.length

    expect(boardsnapshot(currentcp.id)).toBeTruthy()
    expect(book.pages.length).toBe(pagecountbefore + 1)

    const snapname = snapshotpagename(currentcp.id)
    const snappage = memorypickcodepagewithtypeandstat(
      CODE_PAGE_TYPE.BOARD,
      snapname,
    )
    expect(snappage).toBeTruthy()
    const snapboard = memoryreadboardbyaddress(snapname)
    expect(snapboard?.terrain[0]?.char).toBe(219)
  })

  it('re-snapshot replaces prior snapshot page', () => {
    const wall = makewallterrain(0, 0)
    const currentboard = makeboard('here', wall)
    const wallcp = memorycreatecodepage('@terrain wall\n', {
      terrain: { id: 'wall', name: 'wall', kind: 'wall', runtime: '' },
    })
    const currentcp = memorycreatecodepage('@board here\n', {
      board: currentboard,
    })
    const book = setupbooks([wallcp, currentcp])

    boardsnapshot(currentcp.id)
    const countafterfirst = book.pages.length

    currentboard.terrain[0] = undefined

    boardsnapshot(currentcp.id)

    expect(book.pages.length).toBe(countafterfirst)

    const snapboard = memoryreadboardbyaddress(snapshotpagename(currentcp.id))
    expect(snapboard?.terrain[0]?.char).not.toBe(219)
  })

  it('returns undefined when board is missing', () => {
    setupbooks([])
    expect(boardsnapshot('missingboard')).toBeUndefined()
  })

  it('revert restores prior content onto target', () => {
    const wall = makewallterrain(0, 0)
    const currentboard = makeboard('here', wall)
    const wallcp = memorycreatecodepage('@terrain wall\n', {
      terrain: { id: 'wall', name: 'wall', kind: 'wall', runtime: '' },
    })
    const currentcp = memorycreatecodepage('@board here\n', {
      board: currentboard,
    })
    setupbooks([wallcp, currentcp])

    boardsnapshot(currentcp.id)
    currentboard.terrain[0] = undefined

    expect(boardrevert(currentcp.id)).toBeTruthy()
    expect(currentboard.terrain[0]?.char).toBe(219)
  })

  it('returns undefined when snapshot is missing', () => {
    const currentboard = makeboard('here')
    const currentcp = memorycreatecodepage('@board here\n', {
      board: currentboard,
    })
    setupbooks([currentcp])

    expect(boardrevert(currentcp.id)).toBeUndefined()
  })
})
