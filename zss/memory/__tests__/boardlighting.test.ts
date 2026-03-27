import { SPRITE } from 'zss/gadget/data/types'
import {
  memoryboardlightingapplyobject,
  memoryboardlightingmarkplayer,
} from 'zss/memory/boardlighting'
import { memoryboardelementindex } from 'zss/memory/boardaccess'
import { BOARD, BOARD_ELEMENT, BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { COLLISION } from 'zss/words/types'

const MOCK_BOARD_WIDTH = 60
const MOCK_BOARD_HEIGHT = 25

jest.mock('zss/words/dir', () => {
  const { DIR: D } =
    jest.requireActual<typeof import('zss/words/types')>('zss/words/types')
  return {
    dirfrompts(from: { x: number; y: number }, to: { x: number; y: number }) {
      if (to.x > from.x) {
        return D.EAST
      }
      if (to.x < from.x) {
        return D.WEST
      }
      if (to.y < from.y) {
        return D.NORTH
      }
      if (to.y > from.y) {
        return D.SOUTH
      }
      return D.IDLE
    },
    isstrdir: () => false,
  }
})

jest.mock('zss/memory/spatialqueries', () => {
  const { COLLISION: C } =
    jest.requireActual<typeof import('zss/words/types')>('zss/words/types')
  type Col = import('zss/words/types').COLLISION
  function memorycheckcollision(
    maybesource: Col | undefined,
    maybedest: Col | undefined,
  ) {
    const source: Col = maybesource ?? C.ISWALK
    const dest: Col = maybedest ?? C.ISWALK
    if (source === C.ISGHOST || dest === C.ISGHOST) {
      return false
    }
    switch (source) {
      case C.ISWALK:
        return dest !== C.ISWALK
      case C.ISSWIM:
        return dest !== C.ISSWIM
      case C.ISSOLID:
        return true
      case C.ISBULLET:
        return dest !== C.ISWALK && dest !== C.ISSWIM
      default:
        return false
    }
  }
  return { memorycheckcollision }
})

jest.mock('zss/memory/boards', () => {
  const { COLLISION: C } =
    jest.requireActual<typeof import('zss/words/types')>('zss/words/types')
  return {
    memoryreadelementkind: (el: { kinddata?: unknown } | undefined) =>
      el?.kinddata,
    memoryreadelementstat: (
      el: Record<string, unknown> | undefined,
      stat: string,
    ) => {
      if (!el) {
        return stat === 'collision' ? C.ISWALK : undefined
      }
      const ev = el[stat]
      if (ev !== undefined) {
        return ev
      }
      const kd = el.kinddata as Record<string, unknown> | undefined
      if (kd?.[stat] !== undefined) {
        return kd[stat]
      }
      if (stat === 'collision') {
        return C.ISWALK
      }
      return undefined
    },
  }
})

jest.mock('zss/memory/boardoperations', () => ({
  memoryboardelementindex(
    board: { terrain?: unknown[] } | undefined,
    pt: { x: number; y: number },
  ) {
    if (!board || pt?.x == null || pt?.y == null) {
      return -1
    }
    if (
      pt.x < 0 ||
      pt.x >= MOCK_BOARD_WIDTH ||
      pt.y < 0 ||
      pt.y >= MOCK_BOARD_HEIGHT
    ) {
      return -1
    }
    return pt.x + pt.y * MOCK_BOARD_WIDTH
  },
  memoryreadobject(
    board: { objects?: Record<string, unknown> } | undefined,
    id: string,
  ) {
    return board?.objects?.[id] as
      | import('zss/memory/types').BOARD_ELEMENT
      | undefined
  },
  memoryevaldir() {
    return { destpt: { x: 0, y: 0 } }
  },
}))

function emptyterrain(): BOARD_ELEMENT[] {
  return Array.from({ length: BOARD_SIZE }, () => ({}))
}

function makeboard(patch?: (terrain: BOARD_ELEMENT[]) => void): BOARD {
  const terrain = emptyterrain()
  patch?.(terrain)
  return {
    id: 'testboard',
    name: 'test',
    terrain,
    objects: {},
  }
}

function testsprite(x: number, y: number): SPRITE {
  return {
    id: 'sprite:test',
    x,
    y,
    char: 0,
    color: 0,
    bg: 0,
    stat: 0,
  }
}

describe('boardlighting', () => {
  describe('memoryboardlightingmarkplayer', () => {
    it('sets the player cell alpha to 0', () => {
      const board = makeboard()
      const sprite = testsprite(12, 7)
      const alphas = new Array<number>(BOARD_SIZE).fill(1)
      memoryboardlightingmarkplayer(board, alphas, sprite)
      const idx = memoryboardelementindex(board, sprite)
      expect(alphas[idx]).toBe(0)
      expect(alphas[idx + 1]).toBe(1)
    })
  })

  describe('memoryboardlightingapplyobject', () => {
    it('only touches the center when light radius rounds to 1', () => {
      const board = makeboard()
      const sprite = testsprite(20, 10)
      const alphas = new Array<number>(BOARD_SIZE).fill(0.25)
      memoryboardlightingapplyobject(board, alphas, {}, sprite, 1)
      const idx = memoryboardelementindex(board, sprite)
      expect(alphas[idx]).toBe(0)
      const east = memoryboardelementindex(board, { x: 21, y: 10 })
      expect(alphas[east]).toBe(0.25)
    })

    it('brightens cells within range on empty walkable terrain', () => {
      const board = makeboard()
      const sprite = testsprite(15, 12)
      const alphas = new Array<number>(BOARD_SIZE).fill(1)
      memoryboardlightingapplyobject(board, alphas, {}, sprite, 4)
      const center = memoryboardelementindex(board, sprite)
      const east = memoryboardelementindex(board, { x: 17, y: 12 })
      expect(alphas[center]).toBe(0)
      expect(alphas[east]).toBeLessThan(1)
    })

    it('darkens cells behind a solid tile along the ray (higher alpha)', () => {
      const boardopen = makeboard()
      const boardwall = makeboard((terrain) => {
        const i = 11 + 10 * BOARD_WIDTH
        terrain[i] = { collision: COLLISION.ISSOLID }
      })
      const sprite = testsprite(10, 10)
      const light = 6
      const alphasopen = new Array<number>(BOARD_SIZE).fill(1)
      const alphaswall = new Array<number>(BOARD_SIZE).fill(1)
      memoryboardlightingapplyobject(boardopen, alphasopen, {}, sprite, light)
      memoryboardlightingapplyobject(boardwall, alphaswall, {}, sprite, light)
      const beyond = memoryboardelementindex(boardopen, { x: 14, y: 10 })
      expect(alphasopen[beyond]).toBeLessThan(1)
      expect(alphaswall[beyond]).toBeGreaterThanOrEqual(alphasopen[beyond])
    })

    it('darkens cells beyond a lookup object versus the same layout without it', () => {
      const blockerid = 'blocker'
      const bx = 18
      const by = 10
      const bidx = bx + by * BOARD_WIDTH

      const boardplain = makeboard()
      const boardwithobj = makeboard()
      boardwithobj.objects[blockerid] = { id: blockerid, x: bx, y: by }
      boardwithobj.lookup = new Array<string>(BOARD_SIZE).fill('')
      boardwithobj.lookup[bidx] = blockerid

      const sprite = testsprite(15, 10)
      const light = 7
      const plainalphas = new Array<number>(BOARD_SIZE).fill(1)
      const withalphas = new Array<number>(BOARD_SIZE).fill(1)
      memoryboardlightingapplyobject(boardplain, plainalphas, {}, sprite, light)
      memoryboardlightingapplyobject(
        boardwithobj,
        withalphas,
        {},
        sprite,
        light,
      )
      const east = memoryboardelementindex(boardplain, { x: 21, y: 10 })
      expect(plainalphas[east]).toBeLessThan(1)
      expect(withalphas[east]).toBeGreaterThanOrEqual(plainalphas[east])
    })

    it('adds occlusion from two inline lookup objects more than a single one', () => {
      const lightx = 15
      const y = 10
      const sprite = testsprite(lightx, y)
      const light = 7
      const targetx = 20
      const east = targetx + y * BOARD_WIDTH

      function runwithblockers(ids: { id: string; x: number }[]) {
        const board = makeboard()
        board.lookup = new Array<string>(BOARD_SIZE).fill('')
        for (let i = 0; i < ids.length; i++) {
          const { id, x } = ids[i]
          board.objects[id] = { id, x, y }
          board.lookup[x + y * BOARD_WIDTH] = id
        }
        const alphas = new Array<number>(BOARD_SIZE).fill(1)
        memoryboardlightingapplyobject(board, alphas, {}, sprite, light)
        return alphas[east]
      }

      const plain = runwithblockers([])
      const one = runwithblockers([{ id: 'o1', x: 17 }])
      const two = runwithblockers([
        { id: 'o1', x: 16 },
        { id: 'o2', x: 18 },
      ])
      expect(plain).toBeLessThan(1)
      expect(one).toBeGreaterThan(plain)
      /** Narrow object wedges can saturate alpha with one blocker on-axis; two never lighten. */
      expect(two).toBeGreaterThanOrEqual(one)
      expect(two).toBeGreaterThan(plain)
    })

    it('does not brighten floor beyond north/south walls of an east-west corridor (corner leak regression)', () => {
      const corridor_y = 12
      const x0 = 8
      const x1 = 48
      const board = makeboard((terrain) => {
        for (let x = x0; x <= x1; x++) {
          terrain[x + (corridor_y - 1) * BOARD_WIDTH] = {
            collision: COLLISION.ISSOLID,
          }
          terrain[x + (corridor_y + 1) * BOARD_WIDTH] = {
            collision: COLLISION.ISSOLID,
          }
        }
      })
      const sprite = testsprite(x1 - 2, corridor_y)
      const alphas = new Array<number>(BOARD_SIZE).fill(1)
      memoryboardlightingapplyobject(board, alphas, {}, sprite, 10)
      const northbeyond = memoryboardelementindex(board, {
        x: x0 + 5,
        y: corridor_y - 2,
      })
      const southbeyond = memoryboardelementindex(board, {
        x: x0 + 5,
        y: corridor_y + 2,
      })
      expect(alphas[northbeyond]).toBe(1)
      expect(alphas[southbeyond]).toBe(1)
    })

    it('terminates for many random light applications', () => {
      const t0 = performance.now()
      for (let n = 0; n < 80; n++) {
        const board = makeboard()
        const x = 5 + Math.floor(Math.random() * (BOARD_WIDTH - 10))
        const y = 2 + Math.floor(Math.random() * 20)
        const sprite = testsprite(x, y)
        const alphas = new Array<number>(BOARD_SIZE).fill(1)
        memoryboardlightingapplyobject(
          board,
          alphas,
          {},
          sprite,
          2 + Math.floor(Math.random() * 8),
        )
      }
      expect(performance.now() - t0).toBeLessThan(8000)
    })
  })
})
