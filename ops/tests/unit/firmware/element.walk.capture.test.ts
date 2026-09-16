import type { CHIP } from 'zss/chip'
import { ELEMENT_FIRMWARE } from 'zss/firmware/element'
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
  const flags: Record<string, unknown> = {}
  return {
    set: jest.fn((name: string, value: unknown) => {
      flags[name] = value
    }),
    get: jest.fn((name: string) => flags[name]),
    flags,
  } as unknown as CHIP & { flags: Record<string, unknown> }
}

describe('element #walk dir capture', () => {
  afterEach(() => {
    READ_CONTEXT.board = undefined
    READ_CONTEXT.book = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
    READ_CONTEXT.get = undefined
    READ_CONTEXT.words = []
    memoryresetbooks([])
  })

  function setupboard() {
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memorycreateboard()
    board.id = boardpage.id
    memoryensureboardready(board)
    const self = memorycreateboardobjectfromkind(
      board,
      { x: 10, y: 10 },
      'object',
      'oid_self',
    )!
    self.stepx = 1
    self.stepy = 0
    READ_CONTEXT.book = book
    READ_CONTEXT.board = board
    READ_CONTEXT.element = self
    READ_CONTEXT.elementid = self.id ?? ''
    return { board, self }
  }

  function walk(chip: CHIP, words: string[]) {
    const handler = ELEMENT_FIRMWARE.getcommand('walk')
    expect(handler).toBeDefined()
    return handler!(chip, words)
  }

  it('#walk n writes stepx/stepy and does not set dest names', () => {
    const { self } = setupboard()
    const chip = makechip()
    expect(walk(chip, ['n'])).toBe(0)
    expect(self.stepx).toBe(0)
    expect(self.stepy).toBe(-1)
    expect(chip.set).not.toHaveBeenCalled()
  })

  it('#walk n p3 p4 captures deltas and leaves stepx/stepy', () => {
    const { self } = setupboard()
    const chip = makechip()
    expect(walk(chip, ['n', 'p3', 'p4'])).toBe(0)
    expect(chip.flags.p3).toBe(0)
    expect(chip.flags.p4).toBe(-1)
    expect(self.stepx).toBe(1)
    expect(self.stepy).toBe(0)
  })

  it('#walk idle zeros step', () => {
    const { self } = setupboard()
    const chip = makechip()
    expect(walk(chip, ['idle'])).toBe(0)
    expect(self.stepx).toBe(0)
    expect(self.stepy).toBe(0)
    expect(chip.set).not.toHaveBeenCalled()
  })

  it('#walk cw e dx dy captures rotated delta', () => {
    const { self } = setupboard()
    const chip = makechip()
    expect(walk(chip, ['cw', 'e', 'dx', 'dy'])).toBe(0)
    expect(chip.flags.dx).toBe(0)
    expect(chip.flags.dy).toBe(1)
    expect(self.stepx).toBe(1)
    expect(self.stepy).toBe(0)
  })

  it('#walk n p3 with one name still walks', () => {
    const { self } = setupboard()
    const chip = makechip()
    expect(walk(chip, ['n', 'p3'])).toBe(0)
    expect(self.stepx).toBe(0)
    expect(self.stepy).toBe(-1)
    expect(chip.set).not.toHaveBeenCalled()
  })
})
