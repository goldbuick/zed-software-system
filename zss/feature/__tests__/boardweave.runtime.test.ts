import { boardweavegroup } from 'zss/feature/boardweave'
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
    x: 5,
    y: 5,
    kind: 'wall',
    group: 'grp',
    char: 219,
    runtime: '',
  }
  memorywriteboardelementruntime(tile, {
    category: CATEGORY.ISTERRAIN,
    kinddata: { id: 'wall', name: 'wall', runtime: '' },
  })
  terrain[pttoindex({ x: 5, y: 5 }, BOARD_WIDTH)] = tile
  return {
    id: 'weaveboard',
    name: 'weaveboard',
    terrain,
    objects: {},
    runtime: '',
  }
}

describe('boardweavegroup runtime', () => {
  afterEach(() => {
    memoryresetbooks([])
    READ_CONTEXT.book = undefined
  })

  it('clones terrain runtime when shifting a group tile', () => {
    const board = maketestboard()
    const srcidx = pttoindex({ x: 5, y: 5 }, BOARD_WIDTH)
    const src = board.terrain[srcidx]!
    const srcruntimeid = src.runtime

    const cp = memorycreatecodepage('@board weaveboard\n', { board })
    const book = memorycreatebook([cp])
    memoryresetbooks([book])
    READ_CONTEXT.book = book

    expect(boardweavegroup('weaveboard', { x: 1, y: 0 }, '', 'grp')).toBe(true)

    const destidx = pttoindex({ x: 6, y: 5 }, BOARD_WIDTH)
    const dest = board.terrain[destidx]
    expect(dest).toBeDefined()
    expect(dest!.runtime).not.toBe(srcruntimeid)
    expect(memoryreadboardelementruntime(dest)?.kinddata?.name).toBe('wall')
    expect(memoryreadboardelementruntime(dest)?.category).toBe(
      CATEGORY.ISTERRAIN,
    )
  })
})
