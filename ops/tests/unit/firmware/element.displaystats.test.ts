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
import { COLOR } from 'zss/words/types'

function makechip() {
  const flags: Record<string, unknown> = {}
  return {
    set: jest.fn((name: string, value: unknown) => {
      flags[name] = value
    }),
    get: jest.fn((name: string) => flags[name]),
    flags,
  } as unknown as CHIP
}

describe('draw pass GET vs SET color', () => {
  afterEach(() => {
    READ_CONTEXT.board = undefined
    READ_CONTEXT.book = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
    READ_CONTEXT.usedisplaystats = false
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
    self.color = COLOR.BLUE
    self.displaycolor = COLOR.WHITE
    READ_CONTEXT.book = book
    READ_CONTEXT.board = board
    READ_CONTEXT.element = self
    READ_CONTEXT.elementid = self.id ?? ''
    READ_CONTEXT.usedisplaystats = true
    return { self }
  }

  it('GET color returns instance color when usedisplaystats is true', () => {
    setupboard()
    const chip = makechip()
    const [ok, value] = ELEMENT_FIRMWARE.get!(chip, 'color')
    expect(ok).toBe(true)
    expect(value).toBe(COLOR.BLUE)
  })

  it('SET color writes instance color when usedisplaystats is true', () => {
    const { self } = setupboard()
    const chip = makechip()
    const [ok] = ELEMENT_FIRMWARE.set!(chip, 'color', COLOR.RED)
    expect(ok).toBe(true)
    expect(self.color).toBe(COLOR.RED)
    expect(self.displaycolor).toBe(COLOR.WHITE)
  })

  it('SET displaycolor writes displaycolor when usedisplaystats is true', () => {
    const { self } = setupboard()
    const chip = makechip()
    const [ok] = ELEMENT_FIRMWARE.set!(chip, 'displaycolor', COLOR.GREEN)
    expect(ok).toBe(true)
    expect(self.color).toBe(COLOR.BLUE)
    expect(self.displaycolor).toBe(COLOR.GREEN)
  })
})
