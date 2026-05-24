import { boardpivotgroup } from 'zss/feature/boardpivot'
import { pttoindex } from 'zss/mapping/2d'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import {
  memoryreadboardelementruntime,
  memorywriteboardelementruntime,
} from 'zss/memory/runtimeboundary'
import { memoryresetbooks } from 'zss/memory/session'
import { BOARD, BOARD_ELEMENT, BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { CATEGORY } from 'zss/words/types'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 0,
    DRAW_CHAR_HEIGHT: () => 0,
  },
}))

function maketestboard(): BOARD {
  const terrain = new Array<BOARD_ELEMENT | undefined>(BOARD_SIZE)
  const tile: BOARD_ELEMENT = {
    x: 10,
    y: 10,
    kind: 'wall',
    group: 'grp',
    char: 219,
    runtime: '',
  }
  memorywriteboardelementruntime(tile, {
    category: CATEGORY.ISTERRAIN,
    kinddata: { id: 'wall', name: 'wall', runtime: '' },
  })
  terrain[pttoindex({ x: 10, y: 10 }, BOARD_WIDTH)] = tile
  return {
    id: 'pivotboard',
    name: 'pivotboard',
    terrain,
    objects: {},
    runtime: '',
  }
}

describe('boardpivotgroup runtime', () => {
  afterEach(() => {
    memoryresetbooks([])
    READ_CONTEXT.book = undefined
  })

  it('clones terrain runtime when applying group pivot terrain writes', () => {
    const board = maketestboard()
    const srcidx = pttoindex({ x: 10, y: 10 }, BOARD_WIDTH)
    const src = board.terrain[srcidx]!
    const srcruntimeid = src.runtime

    const cp = memorycreatecodepage('@board pivotboard\n', { board })
    const book = memorycreatebook([cp])
    memoryresetbooks([book])
    READ_CONTEXT.book = book

    expect(boardpivotgroup('pivotboard', 0, '', 'grp')).toBe(true)

    const dest = board.terrain[srcidx]
    expect(dest).toBeDefined()
    expect(dest!.runtime).not.toBe(srcruntimeid)
    expect(memoryreadboardelementruntime(dest)?.kinddata?.name).toBe('wall')
  })
})
