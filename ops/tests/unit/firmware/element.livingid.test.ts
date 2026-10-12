import type { CHIP } from 'zss/chip'
import { ELEMENT_FIRMWARE } from 'zss/firmware/element'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import {
  memorycreatebook,
  memoryreadflags,
} from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLOR } from 'zss/words/types'

const FLAG_PLAYER = 'pid_flags'

function makechip() {
  return {
    set: jest.fn(),
    get: jest.fn(),
  } as unknown as CHIP
}

describe('get living object id', () => {
  afterEach(() => {
    READ_CONTEXT.board = undefined
    READ_CONTEXT.book = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
    READ_CONTEXT.elementfocus = ''
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
    memorycreateboardobjectfromkind(board, { x: 4, y: 5 }, 'object', 'oid_seg')
    memorycreateboardobjectfromkind(board, { x: 1, y: 1 }, 'object', 'color')
    READ_CONTEXT.book = book
    READ_CONTEXT.board = board
    READ_CONTEXT.element = self
    READ_CONTEXT.elementid = self.id ?? ''
    READ_CONTEXT.elementfocus = FLAG_PLAYER
    memoryreadflags(book, FLAG_PLAYER).leader = 'oid_self'
  }

  it('returns an id that is on the board', () => {
    setupboard()
    const [ok, value] = ELEMENT_FIRMWARE.get!(makechip(), 'oid_seg')
    expect(ok).toBe(true)
    expect(value).toBe('oid_seg')
  })

  it('falls through when the id is not on the board', () => {
    setupboard()
    const chip = makechip()
    const [flagok, flagvalue] = ELEMENT_FIRMWARE.get!(chip, 'leader')
    expect(flagok).toBe(true)
    expect(flagvalue).toBe('oid_self')
    const [goneok, gonevalue] = ELEMENT_FIRMWARE.get!(chip, 'oid_gone')
    expect(goneok).toBe(false)
    expect(gonevalue).toBeUndefined()
  })

  it('returns the color stat ahead of an object whose id is color', () => {
    setupboard()
    const [ok, value] = ELEMENT_FIRMWARE.get!(makechip(), 'color')
    expect(ok).toBe(true)
    expect(value).toBe(COLOR.BLUE)
  })
})
