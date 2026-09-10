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

describe('element #pget / #pset', () => {
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
    const north = memorycreateboardobjectfromkind(
      board,
      { x: 10, y: 9 },
      'object',
      'oid_north',
    )!
    north.p3 = 'link-a'
    north.p4 = 'link-b'
    north.stepx = 0
    north.stepy = -1
    READ_CONTEXT.book = book
    READ_CONTEXT.board = board
    READ_CONTEXT.element = self
    READ_CONTEXT.elementid = self.id ?? ''
    READ_CONTEXT.get = (name: string) => {
      const el = READ_CONTEXT.element as Record<string, unknown> | undefined
      return el?.[name]
    }
    return { board, self, north }
  }

  it('#pget dir attr destflag reads neighbor p3', () => {
    setupboard()
    const chip = makechip()
    const handler = ELEMENT_FIRMWARE.getcommand('pget')
    expect(handler).toBeDefined()
    handler!(chip, ['n', 'p3', 'got'])
    expect(chip.flags.got).toBe('link-a')
    expect(chip.flags.didfail).toBe(0)
  })

  it('#pset id attr value writes p4 on target', () => {
    const { north } = setupboard()
    const chip = makechip()
    const handler = ELEMENT_FIRMWARE.getcommand('pset')
    expect(handler).toBeDefined()
    handler!(chip, ['oid_north', 'p4', 'new-leader'])
    expect(north.p4).toBe('new-leader')
    expect(chip.flags.didfail).toBe(0)
  })

  it('#pset dir step walkdir sets stepx/stepy from target cell', () => {
    const { north } = setupboard()
    const chip = makechip()
    const handler = ELEMENT_FIRMWARE.getcommand('pset')
    handler!(chip, ['n', 'step', 'e'])
    expect(north.stepx).toBe(1)
    expect(north.stepy).toBe(0)
    expect(chip.flags.didfail).toBe(0)
  })

  it('#set dest pget id attr matches Weave RHS form', () => {
    setupboard()
    const chip = makechip()
    const handler = ELEMENT_FIRMWARE.getcommand('set')
    handler!(chip, ['apples', 'pget', 'oid_north', 'p3'])
    expect(chip.flags.apples).toBe('link-a')
    expect(chip.flags.didfail).toBe(0)
  })

  it('#pget missing target sets dest 0 and didfail', () => {
    setupboard()
    const chip = makechip()
    const handler = ELEMENT_FIRMWARE.getcommand('pget')
    handler!(chip, ['missing-id', 'p3', 'got'])
    expect(chip.flags.got).toBe(0)
    expect(chip.flags.didfail).toBe(1)
  })

  it('#pget dir id reads neighbor object id', () => {
    setupboard()
    const chip = makechip()
    const handler = ELEMENT_FIRMWARE.getcommand('pget')
    handler!(chip, ['n', 'id', 'got'])
    expect(chip.flags.got).toBe('oid_north')
    expect(chip.flags.didfail).toBe(0)
  })
})
