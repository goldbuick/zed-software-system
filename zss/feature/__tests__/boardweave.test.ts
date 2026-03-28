import { boardweave, boardweavegroup } from 'zss/feature/boardweave'
import { memoryreadterrain } from 'zss/memory/boardaccess'
import { memorycreateboard } from 'zss/memory/boardlifecycle'
import { memoryinitboard, memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryresetbooks } from 'zss/memory/session'
import { BOARD_SIZE, BOARD_WIDTH, BOOK, CODE_PAGE_TYPE } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION, PT } from 'zss/words/types'

function installbookwithboard(
  boardid: string,
  board: ReturnType<typeof memorycreateboard>,
) {
  board.id = boardid
  board.name = boardid
  const book: BOOK = {
    id: 'book_boardweave_test',
    name: 'main',
    timestamp: 0,
    activelist: [],
    pages: [
      {
        id: boardid,
        code: '',
        board,
        stats: { type: CODE_PAGE_TYPE.BOARD, name: boardid },
      },
    ],
    flags: {},
  }
  memoryresetbooks([book])
  READ_CONTEXT.book = book
  return book
}

function terrainat(
  board: NonNullable<ReturnType<typeof memoryreadboardbyaddress>>,
  pt: PT,
) {
  return memoryreadterrain(board, pt.x, pt.y)
}

describe('boardweave rectangular', () => {
  afterEach(() => {
    READ_CONTEXT.book = undefined
    memoryresetbooks([])
  })

  it('preserves terrain outside the woven sub-rectangle', () => {
    const board = memorycreateboard()
    expect(board.terrain.length).toBe(BOARD_SIZE)
    const outside: PT = { x: 10, y: 10 }
    board.terrain[outside.x + outside.y * BOARD_WIDTH] = {
      kind: 'outside_marker',
      x: outside.x,
      y: outside.y,
      collision: COLLISION.ISWALK,
    }
    installbookwithboard('bw_rect', board)
    const b = memoryreadboardbyaddress('bw_rect')
    expect(b).toBeDefined()

    const ok = boardweave(
      'bw_rect',
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      '',
      'terrain',
    )
    expect(ok).toBe(true)
    expect(terrainat(b!, outside)?.kind).toBe('outside_marker')
  })

  it('vacates rectangle cells that are not torus images of another cell in the rectangle', () => {
    const board = memorycreateboard()
    board.terrain[0] = {
      kind: 'a',
      x: 0,
      y: 0,
      collision: COLLISION.ISWALK,
    }
    board.terrain[1] = {
      kind: 'b',
      x: 1,
      y: 0,
      collision: COLLISION.ISWALK,
    }
    installbookwithboard('bw_vacate', board)
    const b = memoryreadboardbyaddress('bw_vacate')!

    const ok = boardweave(
      'bw_vacate',
      { x: 2, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      '',
      'terrain',
    )
    expect(ok).toBe(true)
    expect(terrainat(b, { x: 0, y: 0 })).toBeUndefined()
    expect(terrainat(b, { x: 1, y: 0 })).toBeUndefined()
    expect(terrainat(b, { x: 2, y: 0 })?.kind).toBe('a')
    expect(terrainat(b, { x: 3, y: 0 })?.kind).toBe('b')
  })
})

describe('boardweavegroup', () => {
  afterEach(() => {
    READ_CONTEXT.book = undefined
    memoryresetbooks([])
  })

  it('rotates three group terrain tiles by delta without pairwise swap corruption', () => {
    const board = memorycreateboard()
    const y = 3
    for (let x = 5; x <= 7; ++x) {
      board.terrain[x + y * BOARD_WIDTH] = {
        kind: `t${x}`,
        x,
        y,
        collision: COLLISION.ISWALK,
        group: 'weaveg',
      }
    }
    board.terrain[8 + y * BOARD_WIDTH] = {
      kind: 'floor',
      x: 8,
      y,
      collision: COLLISION.ISWALK,
    }
    installbookwithboard('bw_grp3', board)
    const b = memoryreadboardbyaddress('bw_grp3')!
    memoryinitboard(b)

    const ok = boardweavegroup('bw_grp3', { x: 1, y: 0 }, '', 'weaveg')
    expect(ok).toBe(true)
    expect(terrainat(b, { x: 5, y })?.kind).toBe('floor')
    expect(terrainat(b, { x: 6, y })?.kind).toBe('t5')
    expect(terrainat(b, { x: 7, y })?.kind).toBe('t6')
    expect(terrainat(b, { x: 8, y })?.kind).toBe('t7')
  })

  it('relocates terrain from multiple incoming-only cells into vacated group cells (L-shaped group)', () => {
    const board = memorycreateboard()
    const y = 10
    board.terrain[0 + y * BOARD_WIDTH] = {
      kind: 'g00',
      x: 0,
      y,
      collision: COLLISION.ISWALK,
      group: 'Lg',
    }
    board.terrain[1 + y * BOARD_WIDTH] = {
      kind: 'g10',
      x: 1,
      y,
      collision: COLLISION.ISWALK,
      group: 'Lg',
    }
    board.terrain[0 + (y + 1) * BOARD_WIDTH] = {
      kind: 'g01',
      x: 0,
      y: y + 1,
      collision: COLLISION.ISWALK,
      group: 'Lg',
    }
    board.terrain[2 + y * BOARD_WIDTH] = {
      kind: 'displace_x2',
      x: 2,
      y,
      collision: COLLISION.ISWALK,
    }
    board.terrain[1 + (y + 1) * BOARD_WIDTH] = {
      kind: 'displace_x1y1',
      x: 1,
      y: y + 1,
      collision: COLLISION.ISWALK,
    }
    installbookwithboard('bw_L', board)
    const b = memoryreadboardbyaddress('bw_L')!
    memoryinitboard(b)

    const ok = boardweavegroup('bw_L', { x: 1, y: 0 }, '', 'Lg')
    expect(ok).toBe(true)
    expect(terrainat(b, { x: 0, y })?.kind).toBe('displace_x2')
    expect(terrainat(b, { x: 0, y: y + 1 })?.kind).toBe('displace_x1y1')
    expect(terrainat(b, { x: 1, y })?.kind).toBe('g00')
    expect(terrainat(b, { x: 2, y })?.kind).toBe('g10')
    expect(terrainat(b, { x: 1, y: y + 1 })?.kind).toBe('g01')
  })

  it('applies diagonal delta for two separated group terrain cells', () => {
    const board = memorycreateboard()
    const y = 4
    board.terrain[4 + y * BOARD_WIDTH] = {
      kind: 'd0',
      x: 4,
      y,
      collision: COLLISION.ISWALK,
      group: 'diag',
    }
    board.terrain[5 + (y + 1) * BOARD_WIDTH] = {
      kind: 'd1',
      x: 5,
      y: y + 1,
      collision: COLLISION.ISWALK,
      group: 'diag',
    }
    installbookwithboard('bw_diag', board)
    const b = memoryreadboardbyaddress('bw_diag')!
    memoryinitboard(b)

    const ok = boardweavegroup('bw_diag', { x: 1, y: 1 }, '', 'diag')
    expect(ok).toBe(true)
    expect(terrainat(b, { x: 5, y: y + 1 })?.kind).toBe('d0')
    expect(terrainat(b, { x: 6, y: y + 2 })?.kind).toBe('d1')
  })

  it('restores board when an apply-phase object move fails', async () => {
    jest.resetModules()
    const movementmod = await import('zss/memory/boardmovement')
    const actualmove = movementmod.memorymoveobject
    let firstinvocations = 0
    const spy = jest
      .spyOn(movementmod, 'memorymoveobject')
      .mockImplementation((book, board, element, dest) => {
        if (element?.id === 'first') {
          firstinvocations += 1
          if (firstinvocations >= 2) {
            return false
          }
        }
        return actualmove(book, board, element, dest)
      })
    const { boardweavegroup: boardweavegroupfresh } =
      await import('zss/feature/boardweave')

    const board = memorycreateboard()
    for (const x of [2, 3]) {
      board.terrain[x + 2 * BOARD_WIDTH] = {
        kind: 'tg',
        x,
        y: 2,
        collision: COLLISION.ISWALK,
        group: 'rb',
      }
    }
    board.objects.first = {
      id: 'first',
      kind: 'crate',
      x: 3,
      y: 2,
      collision: COLLISION.ISGHOST,
      group: 'rb',
    }
    board.objects.second = {
      id: 'second',
      kind: 'crate',
      x: 2,
      y: 2,
      collision: COLLISION.ISGHOST,
      group: 'rb',
    }
    installbookwithboard('bw_rb', board)
    const b = memoryreadboardbyaddress('bw_rb')!
    memoryinitboard(b)

    const ok = boardweavegroupfresh('bw_rb', { x: 1, y: 0 }, '', 'rb')
    expect(ok).toBe(false)
    expect(b.objects.first?.x).toBe(3)
    expect(b.objects.second?.x).toBe(2)
    expect(terrainat(b, { x: 2, y: 2 })?.kind).toBe('tg')
    expect(terrainat(b, { x: 3, y: 2 })?.kind).toBe('tg')

    spy.mockRestore()
  })
})
