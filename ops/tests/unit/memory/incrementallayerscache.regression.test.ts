import { LAYER_TYPE, type TICKER } from 'zss/gadget/data/types'
import { pttoindex } from 'zss/mapping/2d'
import { memoryupdatedrawdirty } from 'zss/memory/boarddrawdirty'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import {
  memoryconverttogadgetlayers,
  memoryincrementallayerscachestable,
} from 'zss/memory/rendering'
import { memoryreadboardruntime } from 'zss/memory/runtimeboundary'
import { BOARD_WIDTH } from 'zss/memory/types'
import { DIR } from 'zss/words/types'

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

function readplayersprite(layers: ReturnType<typeof memoryconverttogadgetlayers>) {
  const spritelayer = layers.find((layer) => layer.type === LAYER_TYPE.SPRITES)
  if (spritelayer?.type !== LAYER_TYPE.SPRITES) {
    return undefined
  }
  return spritelayer.sprites.find((sprite) => sprite.pid === 'pid_player')
}

describe('PERF_INCREMENTAL_LAYERS regression', () => {
  it('player move dirties cells without drawallowids but rebuilds sprites', () => {
    const board = memorycreateboard()
    board.id = 'board_incremental'
    memorycreateboardobjectfromkind(
      board,
      { x: 5, y: 5 },
      'player',
      'pid_player',
    )
    const player = board.objects.pid_player
    expect(player).toBeDefined()

    memoryupdatedrawdirty(board, 1)
    memoryupdatedrawdirty(board, 2)
    expect(memoryreadboardruntime(board)?.drawallowids?.size ?? 0).toBe(0)

    player!.x = 6
    player!.y = 6
    memoryupdatedrawdirty(board, 3)

    const runtime = memoryreadboardruntime(board)
    expect(runtime?.drawallowids?.size ?? 0).toBe(0)
    expect(runtime?.drawdirtycells?.length ?? 0).toBeGreaterThan(0)
    expect(memoryincrementallayerscachestable(runtime)).toBe(false)
    expect(runtime?.drawdirtycells).toEqual(
      expect.arrayContaining([
        pttoindex({ x: 5, y: 5 }, BOARD_WIDTH),
        pttoindex({ x: 6, y: 6 }, BOARD_WIDTH),
      ]),
    )
  })

  it('warm cache rebuilds sprite positions after player move', () => {
    const board = memorycreateboard()
    board.id = 'board_incremental'
    memorycreateboardobjectfromkind(
      board,
      { x: 5, y: 5 },
      'player',
      'pid_player',
    )
    const player = board.objects.pid_player!
    const tickers: TICKER[] = []

    memoryupdatedrawdirty(board, 1)
    let layers = memoryconverttogadgetlayers('iso', 0, board, tickers, DIR.MID)
    expect(readplayersprite(layers)).toMatchObject({ x: 5, y: 5 })

    memoryupdatedrawdirty(board, 2)
    layers = memoryconverttogadgetlayers('iso', 0, board, tickers, DIR.MID)
    expect(readplayersprite(layers)).toMatchObject({ x: 5, y: 5 })

    player.x = 6
    player.y = 6
    memoryupdatedrawdirty(board, 3)
    layers = memoryconverttogadgetlayers('iso', 0, board, tickers, DIR.MID)
    expect(readplayersprite(layers)).toMatchObject({ x: 6, y: 6 })
  })
})
