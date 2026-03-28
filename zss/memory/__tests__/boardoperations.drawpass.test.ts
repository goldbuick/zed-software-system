import { memorytickboard } from 'zss/memory/boardtick'
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
  } as BOARD
}

function maketerrain(x: number, y: number, code: string): BOARD_ELEMENT {
  return {
    x,
    y,
    kind: 'terrain_kind',
    kinddata: { id: 'terrain_kind', code },
  }
}

function makeobject(
  id: string,
  code: string,
  collision: COLLISION = COLLISION.ISWALK,
): BOARD_ELEMENT {
  return {
    id,
    x: 1,
    y: 1,
    collision,
    kind: 'object_kind',
    kinddata: { id: 'object_kind', code },
  }
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
})
