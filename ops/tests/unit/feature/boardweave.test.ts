import { boardweavegroup } from 'zss/feature/boardweave'
import { pttoindex } from 'zss/mapping/2d'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import { BOARD, BOARD_ELEMENT, BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { CATEGORY, COLLISION } from 'zss/words/types'

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
  opts?: { group?: string; collision?: COLLISION },
): BOARD_ELEMENT {
  const tile: BOARD_ELEMENT = {
    x,
    y,
    kind: 'wall',
    name: 'wall',
    char: 219,
    color: 2,
    group: opts?.group,
    collision: opts?.collision,
  }
  Object.assign(tile, {
    category: CATEGORY.ISTERRAIN,
    kinddata: {
      id: 'wall',
      name: 'wall',
      char: 219,
      collision: opts?.collision ?? COLLISION.ISWALK,
    },
  })
  return tile
}

function makeobject(
  id: string,
  x: number,
  y: number,
  opts?: { group?: string; collision?: COLLISION },
): BOARD_ELEMENT {
  const el: BOARD_ELEMENT = {
    id,
    x,
    y,
    kind: 'gem',
    name: 'gem',
    char: 4,
    color: 14,
    group: opts?.group,
    collision: opts?.collision,
  }
  Object.assign(el, {
    category: CATEGORY.ISOBJECT,
    kinddata: {
      id: el.kind,
      name: el.name,
      char: el.char,
      collision: opts?.collision ?? COLLISION.ISWALK,
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
  }
}

function setupboard(board: BOARD) {
  const boardcp = memorycreatecodepage(`@board ${board.id}\n`, { board })
  const book = memorycreatebook([boardcp])
  memoryresetbooks([book])
  READ_CONTEXT.book = book
  return board
}

describe('boardweavegroup foreign group', () => {
  afterEach(() => {
    memoryresetbooks([])
    READ_CONTEXT.book = undefined
  })

  it('aborts when weaving terrain into another group', () => {
    const a = maketerrain(1, 0, { group: 'a', collision: COLLISION.ISWALK })
    const b = maketerrain(2, 0, { group: 'b', collision: COLLISION.ISWALK })
    const board = setupboard(makeboard('weaveboard', [a, b], []))

    expect(boardweavegroup('weaveboard', { x: 1, y: 0 }, '', 'a')).toBe(false)
    expect(board.terrain[pttoindex({ x: 1, y: 0 }, BOARD_WIDTH)]?.group).toBe(
      'a',
    )
    expect(board.terrain[pttoindex({ x: 2, y: 0 }, BOARD_WIDTH)]?.group).toBe(
      'b',
    )
  })

  it('weaves terrain into empty ungrouped cells', () => {
    const a = maketerrain(1, 0, { group: 'a', collision: COLLISION.ISWALK })
    const board = setupboard(makeboard('weaveboard', [a], []))

    expect(boardweavegroup('weaveboard', { x: 1, y: 0 }, '', 'a')).toBe(true)
    expect(board.terrain[pttoindex({ x: 1, y: 0 }, BOARD_WIDTH)]).toBeUndefined()
    expect(board.terrain[pttoindex({ x: 2, y: 0 }, BOARD_WIDTH)]?.group).toBe(
      'a',
    )
  })

  it('aborts when a solid rider hits a solid destination object', () => {
    const tile = maketerrain(1, 0, {
      group: 'a',
      collision: COLLISION.ISWALK,
    })
    const rider = makeobject('oid_rider', 1, 0, {
      collision: COLLISION.ISSOLID,
    })
    const blocker = makeobject('oid_block', 2, 0, {
      collision: COLLISION.ISSOLID,
    })
    const board = setupboard(makeboard('weaveboard', [tile], [rider, blocker]))

    expect(boardweavegroup('weaveboard', { x: 1, y: 0 }, '', 'a')).toBe(false)
    expect(board.terrain[pttoindex({ x: 1, y: 0 }, BOARD_WIDTH)]?.group).toBe(
      'a',
    )
    expect(board.objects.oid_rider.x).toBe(1)
    expect(board.objects.oid_block.x).toBe(2)
  })

  it('moves a solid rider on walkable group terrain into an empty cell', () => {
    const tile = maketerrain(1, 0, {
      group: 'a',
      collision: COLLISION.ISWALK,
    })
    const rider = makeobject('oid_rider', 1, 0, {
      collision: COLLISION.ISSOLID,
    })
    const board = setupboard(makeboard('weaveboard', [tile], [rider]))

    expect(boardweavegroup('weaveboard', { x: 1, y: 0 }, '', 'a')).toBe(true)
    expect(board.terrain[pttoindex({ x: 1, y: 0 }, BOARD_WIDTH)]).toBeUndefined()
    expect(board.terrain[pttoindex({ x: 2, y: 0 }, BOARD_WIDTH)]?.group).toBe(
      'a',
    )
    expect(board.objects.oid_rider.x).toBe(2)
  })

  it('aborts when a solid group object not on group terrain hits a solid object', () => {
    const mover = makeobject('oid_mover', 1, 0, {
      group: 'a',
      collision: COLLISION.ISSOLID,
    })
    const blocker = makeobject('oid_block', 2, 0, {
      collision: COLLISION.ISSOLID,
    })
    const board = setupboard(makeboard('weaveboard', [], [mover, blocker]))

    expect(boardweavegroup('weaveboard', { x: 1, y: 0 }, '', 'a')).toBe(false)
    expect(board.objects.oid_mover.x).toBe(1)
    expect(board.objects.oid_block.x).toBe(2)
  })

  it('aborts when weaving an object onto another group object', () => {
    const a = makeobject('oid_a', 1, 0, {
      group: 'a',
      collision: COLLISION.ISWALK,
    })
    const b = makeobject('oid_b', 2, 0, {
      group: 'b',
      collision: COLLISION.ISWALK,
    })
    const board = setupboard(makeboard('weaveboard', [], [a, b]))

    expect(boardweavegroup('weaveboard', { x: 1, y: 0 }, '', 'a')).toBe(false)
    expect(board.objects.oid_a.x).toBe(1)
    expect(board.objects.oid_b.x).toBe(2)
  })
})
