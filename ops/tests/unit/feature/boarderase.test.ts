import { boarderase } from 'zss/feature/boarderase'
import { pttoindex } from 'zss/mapping/2d'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memorywriteboardelementruntime } from 'zss/memory/runtimeboundary'
import { memoryresetbooks } from 'zss/memory/session'
import { BOARD, BOARD_ELEMENT, BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { CATEGORY } from 'zss/words/types'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  DEBUG_SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 0,
    DRAW_CHAR_HEIGHT: () => 0,
  },
}))

function maketerrain(
  x: number,
  y: number,
  group?: string,
): BOARD_ELEMENT {
  const tile: BOARD_ELEMENT = {
    x,
    y,
    kind: 'wall',
    name: 'wall',
    char: 219,
    color: 2,
    group,
    runtime: '',
  }
  memorywriteboardelementruntime(tile, {
    category: CATEGORY.ISTERRAIN,
    kinddata: { id: 'wall', name: 'wall', char: 219, runtime: '' },
  })
  return tile
}

function makeobject(
  id: string,
  x: number,
  y: number,
  opts?: { group?: string; name?: string },
): BOARD_ELEMENT {
  const el: BOARD_ELEMENT = {
    id,
    x,
    y,
    kind: opts?.name === 'player' ? 'player' : 'gem',
    name: opts?.name ?? 'gem',
    char: 4,
    color: 14,
    group: opts?.group,
    runtime: '',
  }
  memorywriteboardelementruntime(el, {
    category: CATEGORY.ISOBJECT,
    kinddata: {
      id: el.kind,
      name: el.name,
      char: el.char,
      runtime: '',
    },
  })
  return el
}

function makeboard(
  id: string,
  terraintiles: BOARD_ELEMENT[],
  objects: BOARD_ELEMENT[],
): BOARD {
  const terrain = new Array<BOARD_ELEMENT | undefined>(BOARD_SIZE)
  for (let i = 0; i < terraintiles.length; ++i) {
    const tile = terraintiles[i]
    terrain[pttoindex({ x: tile.x ?? 0, y: tile.y ?? 0 }, BOARD_WIDTH)] = tile
  }
  const objectmap: Record<string, BOARD_ELEMENT> = {}
  for (let i = 0; i < objects.length; ++i) {
    const el = objects[i]
    objectmap[el.id ?? `obj${i}`] = el
  }
  return {
    id,
    name: id,
    terrain,
    objects: objectmap,
    runtime: '',
  }
}

describe('boarderase', () => {
  afterEach(() => {
    memoryresetbooks([])
    READ_CONTEXT.book = undefined
  })

  it('erases group members and leaves other groups and players', () => {
    const g1 = maketerrain(0, 0, 'mygroup')
    const g2 = maketerrain(1, 0, 'other')
    const obj = makeobject('o1', 2, 0, { group: 'mygroup' })
    const player = makeobject('pid_p1', 3, 0, {
      group: 'mygroup',
      name: 'player',
    })
    const board = makeboard('eraseboard', [g1, g2], [obj, player])
    const boardcp = memorycreatecodepage('@board eraseboard\n', {
      board,
    })
    const book = memorycreatebook([boardcp])
    memoryresetbooks([book])
    READ_CONTEXT.book = book

    expect(
      boarderase(
        'eraseboard',
        { x: 0, y: 0 },
        { x: BOARD_WIDTH - 1, y: 0 },
        '',
        'mygroup',
      ),
    ).toBe(true)

    expect(board.terrain[pttoindex({ x: 0, y: 0 }, BOARD_WIDTH)]?.kind).toBe(
      undefined,
    )
    expect(board.terrain[pttoindex({ x: 1, y: 0 }, BOARD_WIDTH)]?.kind).toBe(
      'wall',
    )
    expect(board.objects.o1.removed).toBe(book.timestamp)
    expect(board.objects.pid_p1.removed).toBeUndefined()
  })

  it('erases only within region for targetset all', () => {
    const a = maketerrain(0, 0)
    const b = maketerrain(5, 5)
    const board = makeboard('eraseboard', [a, b], [])
    const boardcp = memorycreatecodepage('@board eraseboard\n', {
      board,
    })
    const book = memorycreatebook([boardcp])
    memoryresetbooks([book])
    READ_CONTEXT.book = book

    expect(
      boarderase('eraseboard', { x: 0, y: 0 }, { x: 0, y: 0 }, '', 'all'),
    ).toBe(true)

    expect(board.terrain[pttoindex({ x: 0, y: 0 }, BOARD_WIDTH)]?.kind).toBe(
      undefined,
    )
    expect(board.terrain[pttoindex({ x: 5, y: 5 }, BOARD_WIDTH)]?.kind).toBe(
      'wall',
    )
  })

  it('returns false when nothing matches', () => {
    const board = makeboard('eraseboard', [maketerrain(0, 0, 'other')], [])
    const boardcp = memorycreatecodepage('@board eraseboard\n', {
      board,
    })
    const book = memorycreatebook([boardcp])
    memoryresetbooks([book])
    READ_CONTEXT.book = book

    expect(
      boarderase(
        'eraseboard',
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        '',
        'missinggroup',
      ),
    ).toBe(false)
  })
})
