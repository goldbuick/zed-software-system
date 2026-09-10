import type { CHIP } from 'zss/chip'
import { BOARD_FIRMWARE } from 'zss/firmware/board'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { READ_CONTEXT } from 'zss/words/reader'

function makechip() {
  return {
    set: jest.fn(),
    get: jest.fn(),
  } as unknown as CHIP
}

describe('#push once per tick', () => {
  afterEach(() => {
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
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memorycreateboard()
    board.id = boardpage.id
    memoryensureboardready(board)
    const self = memorycreateboardobjectfromkind(
      board,
      { x: 5, y: 5 },
      'object',
      'oid_self',
    )!
    const crate = memorycreateboardobjectfromkind(
      board,
      { x: 6, y: 5 },
      'object',
      'oid_crate',
    )!
    crate.pushable = 1
    READ_CONTEXT.book = book
    READ_CONTEXT.board = board
    READ_CONTEXT.element = self
    READ_CONTEXT.elementid = self.id ?? ''
    READ_CONTEXT.elementfocus = self.id ?? ''
    READ_CONTEXT.timestamp = 100
    READ_CONTEXT.get = (name: string) => {
      const el = READ_CONTEXT.element as Record<string, unknown> | undefined
      return el?.[name]
    }
    return { board, self, crate }
  }

  it('moves a pushable object at most once per timestamp via #push', () => {
    const { crate } = setup()
    const chip = makechip()
    const push = BOARD_FIRMWARE.getcommand('push')!
    push(chip, ['at', 6, 5, 'e'])
    expect(crate.x).toBe(7)
    expect(crate.y).toBe(5)
    push(chip, ['at', 7, 5, 'e'])
    expect(crate.x).toBe(7)
    expect(crate.y).toBe(5)
  })

  it('allows another #push after the timestamp advances', () => {
    const { crate } = setup()
    const chip = makechip()
    const push = BOARD_FIRMWARE.getcommand('push')!
    push(chip, ['at', 6, 5, 'e'])
    expect(crate.x).toBe(7)
    READ_CONTEXT.timestamp = 101
    push(chip, ['at', 7, 5, 'e'])
    expect(crate.x).toBe(8)
    expect(crate.y).toBe(5)
  })

  it('does not restrict #shove in the same timestamp', () => {
    const { crate } = setup()
    const chip = makechip()
    const shove = BOARD_FIRMWARE.getcommand('shove')!
    shove(chip, ['at', 6, 5, 'e'])
    expect(crate.x).toBe(7)
    shove(chip, ['at', 7, 5, 'e'])
    expect(crate.x).toBe(8)
    expect(crate.y).toBe(5)
  })
})
