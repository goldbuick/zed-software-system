import { memoryupdatedrawdirty } from 'zss/memory/boarddrawdirty'
import { memorytickboard } from 'zss/memory/boardtick'
import {
  memoryreadboardruntime,
  memorywriteboardelementruntime,
} from 'zss/memory/runtimeboundary'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_SIZE,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { COLLISION } from 'zss/words/types'

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

jest.mock('tone', () => ({
  Time: class TimeMock {},
}))

jest.mock('zss/lang/generator', () => ({
  compile: (_name: string, code: string) => ({
    labels:
      code.includes(':drawdisplay') || code.includes(':draw')
        ? { drawdisplay: [1] }
        : {},
  }),
}))

function makeboard(
  objects: Record<string, BOARD_ELEMENT>,
  terrain: BOARD_ELEMENT[],
) {
  return {
    id: 'board_test',
    name: 'board test',
    objects,
    terrain,
    runtime: '',
  } as BOARD
}

function maketerrain(x: number, y: number, code: string): BOARD_ELEMENT {
  const terrain: BOARD_ELEMENT = {
    x,
    y,
    kind: 'terrain_kind',
    runtime: '',
  }
  memorywriteboardelementruntime(terrain, {
    kinddata: { id: 'terrain_kind', code, runtime: '' },
  })
  return terrain
}

function makeobject(
  id: string,
  code: string,
  collision: COLLISION = COLLISION.ISWALK,
): BOARD_ELEMENT {
  const object: BOARD_ELEMENT = {
    id,
    x: 1,
    y: 1,
    collision,
    kind: 'object_kind',
    runtime: '',
  }
  memorywriteboardelementruntime(object, {
    kinddata: { id: 'object_kind', code, runtime: '' },
  })
  return object
}

describe('memorytickboard draw pass', () => {
  it('collects terrain and object entries with :draw before tick entries', () => {
    const terrain = new Array<BOARD_ELEMENT>(BOARD_SIZE)
    terrain[0] = maketerrain(0, 0, ':draw\n#end')

    const objectdraw = makeobject('sid_draw', ':draw\n#end')
    const objecttick = makeobject('sid_tick', ':tick\n#end')
    const board = makeboard(
      {
        [objectdraw.id ?? '']: objectdraw,
        [objecttick.id ?? '']: objecttick,
      },
      terrain,
    )

    const run = memorytickboard(board, 1)
    const draw = run.filter((item) => item.pass === 'draw')
    const tick = run.filter(
      (item) => item.pass !== 'draw' && item.type === CODE_PAGE_TYPE.OBJECT,
    )

    expect(draw).toHaveLength(2)
    expect(draw[0].type).toBe(CODE_PAGE_TYPE.TERRAIN)
    expect(draw[1].object?.id).toBe('sid_draw')
    expect(draw.every((item) => item.label === 'drawdisplay')).toBe(true)
    expect(tick.map((item) => item.object?.id)).toEqual([
      'sid_draw',
      'sid_tick',
    ])
  })

  it('preserves existing normal tick ordering for objects', () => {
    const terrain = new Array<BOARD_ELEMENT>(BOARD_SIZE)
    const player = makeobject('pid_0000_testplayer', ':tick\n#end')
    const bullet = makeobject('sid_bullet', ':tick\n#end', COLLISION.ISBULLET)
    const other = makeobject('sid_other', ':tick\n#end', COLLISION.ISSOLID)
    const ghost = makeobject('sid_ghost', ':tick\n#end', COLLISION.ISGHOST)
    const board = makeboard(
      {
        [player.id ?? '']: player,
        [bullet.id ?? '']: bullet,
        [other.id ?? '']: other,
        [ghost.id ?? '']: ghost,
      },
      terrain,
    )

    const run = memorytickboard(board, 1)
    const tick = run.filter(
      (item) => item.pass !== 'draw' && item.type === CODE_PAGE_TYPE.OBJECT,
    )

    expect(tick.map((item) => item.object?.id)).toEqual([
      'sid_bullet',
      'pid_0000_testplayer',
      'sid_other',
      'sid_ghost',
    ])
  })

  it('omits draw pass entries when includedraw is false', () => {
    const terrain = new Array<BOARD_ELEMENT>(BOARD_SIZE)
    terrain[0] = maketerrain(0, 0, ':draw\n#end')

    const objectdraw = makeobject('sid_draw', ':draw\n#end')
    const objecttick = makeobject('sid_tick', ':tick\n#end')
    const board = makeboard(
      {
        [objectdraw.id ?? '']: objectdraw,
        [objecttick.id ?? '']: objecttick,
      },
      terrain,
    )

    const run = memorytickboard(board, 1, false)
    const draw = run.filter((item) => item.pass === 'draw')
    const tick = run.filter(
      (item) => item.pass !== 'draw' && item.type === CODE_PAGE_TYPE.OBJECT,
    )

    expect(draw).toHaveLength(0)
    expect(tick.map((item) => item.object?.id)).toEqual([
      'sid_draw',
      'sid_tick',
    ])
  })

  it('filters draw pass to ids in drawallowids when provided', () => {
    const terrain = new Array<BOARD_ELEMENT>(BOARD_SIZE)
    terrain[0] = maketerrain(0, 0, ':draw\n#end')

    const objectdraw = makeobject('sid_draw', ':draw\n#end')
    const objecttick = makeobject('sid_tick', ':tick\n#end')
    const board = makeboard(
      {
        [objectdraw.id ?? '']: objectdraw,
        [objecttick.id ?? '']: objecttick,
      },
      terrain,
    )

    const run = memorytickboard(board, 1, true, new Set(['sid_draw']))
    const draw = run.filter((item) => item.pass === 'draw')

    expect(draw).toHaveLength(1)
    expect(draw[0].object?.id).toBe('sid_draw')
  })

  it('memoryupdatedrawdirty vacated cell and neighbors after object moves', () => {
    const terrain = new Array<BOARD_ELEMENT>(BOARD_SIZE)
    const tidx = 5 + 5 * 60
    terrain[tidx] = maketerrain(5, 5, ':draw\n#end')

    const mover = makeobject('sid_move', ':draw\n#end')
    mover.x = 5
    mover.y = 5
    const board = makeboard({ [mover.id ?? '']: mover }, terrain)

    memoryupdatedrawdirty(board, 1)
    expect((memoryreadboardruntime(board)?.drawallowids?.size ?? 0) > 0).toBe(
      true,
    )

    memoryupdatedrawdirty(board, 2)
    expect(memoryreadboardruntime(board)?.drawallowids?.size ?? 0).toBe(0)

    mover.x = 6
    mover.y = 6
    memoryupdatedrawdirty(board, 3)

    expect(memoryreadboardruntime(board)?.drawallowids?.has(`${tidx}`)).toBe(
      true,
    )
    expect(memoryreadboardruntime(board)?.drawallowids?.has('sid_move')).toBe(
      true,
    )
  })
})
