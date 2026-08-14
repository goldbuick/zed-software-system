import { LAYER_TYPE } from 'zss/gadget/data/types'
import { pttoindex } from 'zss/mapping/2d'
import { memoryupdatedrawdirty } from 'zss/memory/boarddrawdirty'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
  memorysafedeleteelement,
} from 'zss/memory/boardlifecycle'
import {
  memoryensureboardready,
  memorywriteboardobjectlookup,
} from 'zss/memory/boardlookup'
import { memorymoveobject } from 'zss/memory/boardmovement'
import {
  memoryconverttogadgetlayers,
  memoryincrementallayerscachestable,
} from 'zss/memory/rendering'
import {
  memoryreadboardruntime,
  memorywriteboardelementruntime,
} from 'zss/memory/runtimeboundary'
import { memoryboundariesclear } from 'zss/memory/boundaries'
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

function readbulletsprites(
  layers: ReturnType<typeof memoryconverttogadgetlayers>,
) {
  const spritelayer = layers.find((layer) => layer.type === LAYER_TYPE.SPRITES)
  if (spritelayer?.type !== LAYER_TYPE.SPRITES) {
    return []
  }
  return spritelayer.sprites.filter((sprite) =>
    String(sprite.id).includes('sid_bullet'),
  )
}

describe('bullet soft-delete + incremental layers', () => {
  afterEach(() => {
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('memorysafedeleteelement clears object lookup (soft delete)', () => {
    const board = memorycreateboard()
    board.id = 'board_bullet_lookup'
    const bullet = memorycreateboardobjectfromkind(
      board,
      { x: 3, y: 0 },
      'bullet',
      'sid_bullet1',
    )
    expect(bullet).toBeDefined()
    bullet!.collision = COLLISION.ISBULLET
    memoryensureboardready(board)
    memorywriteboardobjectlookup(board, bullet)

    const idx = 3 + 0 * BOARD_WIDTH
    expect(memoryreadboardruntime(board)?.lookup?.[idx]).toBe('sid_bullet1')

    const ok = memorysafedeleteelement(board, bullet, 100)
    expect(ok).toBe(true)
    expect(bullet!.removed).toBe(100)
    expect(board.objects.sid_bullet1).toBeDefined()
    expect(memoryreadboardruntime(board)?.lookup?.[idx]).toBeUndefined()
  })

  it('soft-deleted bullet leaves layer sprites after warm cache', () => {
    const board = memorycreateboard()
    board.id = 'board_bullet_layers'
    const bullet = memorycreateboardobjectfromkind(
      board,
      { x: 4, y: 1 },
      'bullet',
      'sid_bullet1',
    )
    expect(bullet).toBeDefined()
    bullet!.collision = COLLISION.ISBULLET
    bullet!.char = 248
    memorywriteboardelementruntime(bullet!, {
      category: 1,
      kinddata: {
        id: 'bullet',
        code: '@bullet\n:thud\n#die\n',
        runtime: '',
      },
    })
    memoryensureboardready(board)

    memoryupdatedrawdirty(board, 1)
    let layers = memoryconverttogadgetlayers('flat', 0, board, DIR.MID)
    expect(readbulletsprites(layers).length).toBe(1)

    // idle tick with no changes -> warm stable cache
    memoryupdatedrawdirty(board, 2)
    layers = memoryconverttogadgetlayers('flat', 0, board, DIR.MID)
    expect(readbulletsprites(layers).length).toBe(1)
    expect(
      memoryincrementallayerscachestable(memoryreadboardruntime(board)),
    ).toBe(true)

    memorysafedeleteelement(board, bullet, 3)
    memoryupdatedrawdirty(board, 3)
    const runtime = memoryreadboardruntime(board)
    // Must not reuse stale sprite list that still contains the bullet.
    expect(memoryincrementallayerscachestable(runtime)).toBe(false)
    layers = memoryconverttogadgetlayers('flat', 0, board, DIR.MID)
    expect(readbulletsprites(layers).length).toBe(0)
  })

  it('edge block does not leave bullet in lookup when soft-deleted after thud', () => {
    const board = memorycreateboard()
    board.id = 'board_bullet_edge'
    const bullet = memorycreateboardobjectfromkind(
      board,
      { x: 5, y: 0 },
      'bullet',
      'sid_bullet1',
    )
    expect(bullet).toBeDefined()
    bullet!.collision = COLLISION.ISBULLET
    bullet!.stepx = 0
    bullet!.stepy = -1
    memoryensureboardready(board)
    memorywriteboardobjectlookup(board, bullet)

    // Simulate failed north move into edge, then soft-delete (thud/#die).
    const moved = memorymoveobject(undefined, board, bullet, {
      x: 5,
      y: -1,
    })
    expect(moved).toBe(false)
    expect(bullet!.x).toBe(5)
    expect(bullet!.y).toBe(0)

    memorysafedeleteelement(board, bullet, 50)
    const idx = pttoindex({ x: 5, y: 0 }, BOARD_WIDTH)
    expect(memoryreadboardruntime(board)?.lookup?.[idx]).toBeUndefined()
  })
})
