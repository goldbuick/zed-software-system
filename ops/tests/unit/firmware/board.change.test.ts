import type { CHIP } from 'zss/chip'
import { BOARD_FIRMWARE } from 'zss/firmware/board'
import { pttoindex } from 'zss/mapping/2d'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
  memorywriteterrainfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryhaltallchips } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { BOARD_WIDTH } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'

function makechip() {
  return {
    set: jest.fn(),
    get: jest.fn(),
    yield: jest.fn(),
  } as unknown as CHIP
}

describe('#change with optional DIR scope', () => {
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
  })

  function setup() {
    const book = memorycreatebook([
      memorycreatecodepage('@terrain wall\n@char 219\n', {}),
      memorycreatecodepage('@terrain slime\n@group slime\n@char 42\n', {}),
      memorycreatecodepage('@terrain gem\n@char 4\n', {}),
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
    READ_CONTEXT.elementid = ''
    // CLI-style: no element focus; INRECT must still evaluate
    READ_CONTEXT.element = undefined
    return { book, board }
  }

  it('empties a group across the whole board (former #erase group)', () => {
    const { board } = setup()
    memorywriteterrainfromkind(board, { x: 0, y: 0 }, 'slime')
    memorywriteterrainfromkind(board, { x: 1, y: 0 }, 'wall')
    const obj = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 0 },
      'slime',
      'sid_s1',
    )!
    obj.group = 'slime'
    const player = memorycreateboardobjectfromkind(
      board,
      { x: 3, y: 0 },
      'player',
      'pid_p1',
    )!
    player.group = 'slime'

    const change = BOARD_FIRMWARE.getcommand('change')!
    change(makechip(), ['slime', 'empty'])

    expect(board.terrain[pttoindex({ x: 0, y: 0 }, BOARD_WIDTH)]?.kind).toBe(
      undefined,
    )
    expect(board.terrain[pttoindex({ x: 1, y: 0 }, BOARD_WIDTH)]?.kind).toBe(
      'wall',
    )
    expect(board.objects.sid_s1.removed).toBe(1)
    expect(board.objects.pid_p1.removed).toBeUndefined()
  })

  it('empties only within rect for targetset all (former #erase region)', () => {
    const { board } = setup()
    memorywriteterrainfromkind(board, { x: 0, y: 0 }, 'wall')
    memorywriteterrainfromkind(board, { x: 5, y: 5 }, 'wall')

    const change = BOARD_FIRMWARE.getcommand('change')!
    change(makechip(), ['inrect', 0, 0, 0, 0, 'all', 'empty'])

    expect(board.terrain[pttoindex({ x: 0, y: 0 }, BOARD_WIDTH)]?.kind).toBe(
      undefined,
    )
    expect(board.terrain[pttoindex({ x: 5, y: 5 }, BOARD_WIDTH)]?.kind).toBe(
      'wall',
    )
  })

  it('empties via one-word rect token without an invoking element', () => {
    const { board } = setup()
    memorywriteterrainfromkind(board, { x: 1, y: 1 }, 'wall')
    memorywriteterrainfromkind(board, { x: 4, y: 4 }, 'wall')

    const change = BOARD_FIRMWARE.getcommand('change')!
    change(makechip(), ['inrect', '1,1,2,2', 'all', 'empty'])

    expect(board.terrain[pttoindex({ x: 1, y: 1 }, BOARD_WIDTH)]?.kind).toBe(
      undefined,
    )
    expect(board.terrain[pttoindex({ x: 4, y: 4 }, BOARD_WIDTH)]?.kind).toBe(
      'wall',
    )
  })

  it('morphs matching elements only inside rect', () => {
    const { board } = setup()
    const a = memorywriteterrainfromkind(board, { x: 0, y: 0 }, 'slime')!
    a.group = 'slime'
    const b = memorywriteterrainfromkind(board, { x: 5, y: 5 }, 'slime')!
    b.group = 'slime'

    const change = BOARD_FIRMWARE.getcommand('change')!
    change(makechip(), ['inrect', 0, 0, 1, 1, 'slime', 'gem'])

    expect(board.terrain[pttoindex({ x: 0, y: 0 }, BOARD_WIDTH)]?.kind).toBe(
      'gem',
    )
    expect(board.terrain[pttoindex({ x: 5, y: 5 }, BOARD_WIDTH)]?.kind).toBe(
      'slime',
    )
  })

  it('empties terrain builtin without a dir', () => {
    const { board } = setup()
    memorywriteterrainfromkind(board, { x: 0, y: 0 }, 'wall')
    memorycreateboardobjectfromkind(board, { x: 1, y: 0 }, 'gem', 'sid_g1')

    const change = BOARD_FIRMWARE.getcommand('change')!
    change(makechip(), ['terrain', 'empty'])

    expect(board.terrain[pttoindex({ x: 0, y: 0 }, BOARD_WIDTH)]?.kind).toBe(
      undefined,
    )
    expect(board.objects.sid_g1.removed).toBeUndefined()
  })
})
