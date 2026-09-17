import type { CHIP } from 'zss/chip'
import { BOARD_FIRMWARE } from 'zss/firmware/board'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorymoveobject } from 'zss/memory/boardmovement'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryhaltallchips } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { READ_CONTEXT } from 'zss/words/reader'

const mockedmemorysendtoelement = jest.fn()
jest.mock('zss/memory/gamesend', () => {
  const actual = jest.requireActual('zss/memory/gamesend') as Record<
    string,
    unknown
  >
  return {
    ...actual,
    memorysendtoelement: (...args: unknown[]) =>
      mockedmemorysendtoelement(...args),
  }
})

function makechip() {
  return {
    set: jest.fn(),
    get: jest.fn(),
    yield: jest.fn(),
  } as unknown as CHIP
}

describe('#transport pair scan + object partytouch', () => {
  afterEach(() => {
    memoryhaltallchips()
    READ_CONTEXT.board = undefined
    READ_CONTEXT.book = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
    READ_CONTEXT.elementfocus = ''
    READ_CONTEXT.timestamp = 0
    READ_CONTEXT.get = undefined
    READ_CONTEXT.words = []
    memoryresetbooks([])
    mockedmemorysendtoelement.mockClear()
  })

  function setup() {
    const book = memorycreatebook([
      memorycreatecodepage('@transporter\n@cycle 1\n#end\n', {}),
      memorycreatecodepage('@boulder\n@ispushable\n@cycle 1\n#end\n', {}),
      memorycreatecodepage('@player\n@cycle 1\n#end\n', {}),
      memorycreatecodepage('@board arena\n', {}),
    ])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memorycreateboard()
    board.id = book.pages.find((p) => p.code?.startsWith('@board'))?.id ?? ''
    memoryensureboardready(board)
    READ_CONTEXT.book = book
    READ_CONTEXT.board = board
    READ_CONTEXT.timestamp = 1
    return { book, board }
  }

  it('lands past the first pair transporter, not the first empty cell', () => {
    const { board } = setup()
    const near = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 5 },
      'transporter',
      'sid_near',
    )!
    near.shootx = 1
    near.shooty = 0
    const far = memorycreateboardobjectfromkind(
      board,
      { x: 5, y: 5 },
      'transporter',
      'sid_far',
    )!
    far.shootx = 1
    far.shooty = 0
    const entrant = memorycreateboardobjectfromkind(
      board,
      { x: 1, y: 5 },
      'boulder',
      'sid_boulder',
    )!

    READ_CONTEXT.element = near
    READ_CONTEXT.elementid = near.id ?? ''
    const transport = BOARD_FIRMWARE.getcommand('transport')!
    transport(makechip(), ['sid_boulder'])

    expect(entrant.x).toBe(6)
    expect(entrant.y).toBe(5)
  })

  it('falls back to first open when no pair exists on the ray', () => {
    const { board } = setup()
    const near = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 5 },
      'transporter',
      'sid_near',
    )!
    near.shootx = 1
    near.shooty = 0
    const entrant = memorycreateboardobjectfromkind(
      board,
      { x: 1, y: 5 },
      'boulder',
      'sid_boulder',
    )!

    READ_CONTEXT.element = near
    READ_CONTEXT.elementid = near.id ?? ''
    const transport = BOARD_FIRMWARE.getcommand('transport')!
    transport(makechip(), ['sid_boulder'])

    expect(entrant.x).toBe(3)
    expect(entrant.y).toBe(5)
  })

  it('no-ops when entrant delta does not match shoot dir', () => {
    const { board } = setup()
    const near = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 5 },
      'transporter',
      'sid_near',
    )!
    near.shootx = 1
    near.shooty = 0
    const entrant = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 4 },
      'boulder',
      'sid_boulder',
    )!

    READ_CONTEXT.element = near
    READ_CONTEXT.elementid = near.id ?? ''
    const transport = BOARD_FIRMWARE.getcommand('transport')!
    transport(makechip(), ['sid_boulder'])

    expect(entrant.x).toBe(2)
    expect(entrant.y).toBe(4)
  })

  it('dual-emits partytouch when object is blocked by object', () => {
    const { board } = setup()
    const blocker = memorycreateboardobjectfromkind(
      board,
      { x: 3, y: 2 },
      'transporter',
      'sid_blocker',
    )!
    const mover = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 2 },
      'boulder',
      'sid_mover',
    )!
    mockedmemorysendtoelement.mockClear()

    const moved = memorymoveobject(READ_CONTEXT.book, board, mover, {
      x: 3,
      y: 2,
    })
    expect(moved).toBe(false)
    expect(mockedmemorysendtoelement).toHaveBeenCalledWith(
      blocker,
      mover,
      'partytouch',
    )
    expect(mockedmemorysendtoelement).toHaveBeenCalledWith(
      mover,
      blocker,
      'partytouch',
    )
  })

  it('still dual-emits touch when player is blocked by object', () => {
    const { board } = setup()
    const blocker = memorycreateboardobjectfromkind(
      board,
      { x: 3, y: 2 },
      'transporter',
      'sid_blocker',
    )!
    const player = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 2 },
      'player',
      'pid_hero',
    )!
    mockedmemorysendtoelement.mockClear()

    const moved = memorymoveobject(READ_CONTEXT.book, board, player, {
      x: 3,
      y: 2,
    })
    expect(moved).toBe(false)
    expect(mockedmemorysendtoelement).toHaveBeenCalledWith(
      blocker,
      player,
      'touch',
    )
    expect(mockedmemorysendtoelement).toHaveBeenCalledWith(
      player,
      blocker,
      'touch',
    )
  })
})
