import { LAYER_TYPE } from 'zss/gadget/data/types'
import { pttoindex } from 'zss/mapping/2d'
import { memoryupdatedrawdirty } from 'zss/memory/boarddrawdirty'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memoryconverttogadgetlayers } from 'zss/memory/rendering'
import { memoryresetbooks } from 'zss/memory/session'
import { BOARD_WIDTH } from 'zss/memory/types'
import { COLLISION, DIR } from 'zss/words/types'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  DEBUG_SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
  PERF_INCREMENTAL_LAYERS: true,
  PERF_TILE_SUBIMAGE: false,
  PERF_SPATIAL_INDEX: true,
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
}))

const GHOST_ID = 'sid_ghost1'

describe('isghost object lighting', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('stamps lightsteps onto a dark board dither layer', () => {
    const board = memorycreateboard()
    board.id = 'board_ghost_light'
    board.isdark = 1
    const ghost = memorycreateboardobjectfromkind(
      board,
      { x: 30, y: 12 },
      'ghost',
      GHOST_ID,
    )
    expect(ghost).toBeDefined()
    ghost!.collision = COLLISION.ISGHOST
    ghost!.lightsteps = 1
    ghost!.char = 1
    memoryensureboardready(board)
    memoryupdatedrawdirty(board, 1)

    const layers = memoryconverttogadgetlayers('flat', 0, board, DIR.MID)
    const sprites = layers.find((layer) => layer.type === LAYER_TYPE.SPRITES)
    const dither = layers.find((layer) => layer.type === LAYER_TYPE.DITHER)
    expect(sprites?.type).toBe(LAYER_TYPE.SPRITES)
    expect(dither?.type).toBe(LAYER_TYPE.DITHER)
    if (
      sprites?.type !== LAYER_TYPE.SPRITES ||
      dither?.type !== LAYER_TYPE.DITHER
    ) {
      return
    }

    expect(
      sprites.sprites.some((sprite) => String(sprite.id).includes(GHOST_ID)),
    ).toBe(true)
    expect(dither.alphas[pttoindex({ x: 30, y: 12 }, BOARD_WIDTH)]).toBe(0)
    expect(dither.alphas[pttoindex({ x: 0, y: 0 }, BOARD_WIDTH)]).toBe(1)
  })
})
