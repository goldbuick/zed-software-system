import type { CHIP } from 'zss/chip'
import { BOARD_FIRMWARE } from 'zss/firmware/board'
import { READ_LAYER, memoryreadelement } from 'zss/memory/boardaccess'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memoryreadelementstat } from 'zss/memory/boards'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryhaltallchips } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION } from 'zss/words/types'

function makechip() {
  const flags: Record<string, unknown> = {}
  return {
    set: jest.fn((name: string, value: unknown) => {
      flags[name] = value
    }),
    get: jest.fn((name: string) => flags[name]),
    yield: jest.fn(),
    flags,
  } as unknown as CHIP & { flags: Record<string, unknown> }
}

describe('#shoot collision vs breakable', () => {
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

  function setupshooter(pages: string[]) {
    const codepages = pages.map((code) => memorycreatecodepage(code, {}))
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([...codepages, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memorycreateboard()
    board.id = boardpage.id
    memoryensureboardready(board)
    const self = memorycreateboardobjectfromkind(
      board,
      { x: 5, y: 5 },
      'gun',
      'oid_gun',
    )!
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
    return { board, self }
  }

  it('forces ISBULLET but keeps @isbreakable from kind', () => {
    const { board } = setupshooter([
      '@gun\n@cycle 1\n#end\n',
      '@bullet\n@isbreakable\n@cycle 1\n@char 248\n#end\n',
    ])
    const chip = makechip()
    const shoot = BOARD_FIRMWARE.getcommand('shoot')!
    shoot(chip, ['e', 'bullet'])
    expect(chip.flags.didfail).toBe(0)
    const shot = memoryreadelement(board, { x: 6, y: 5 }, READ_LAYER.OBJECT)
    expect(shot).toBeDefined()
    expect(shot?.kind).toBe('bullet')
    expect(memoryreadelementstat(shot, 'collision')).toBe(COLLISION.ISBULLET)
    expect(memoryreadelementstat(shot, 'breakable')).toBe(1)
  })

  it('forces ISBULLET but keeps @notbreakable from kind', () => {
    const { board } = setupshooter([
      '@gun\n@cycle 1\n#end\n',
      '@star\n@notbreakable\n@cycle 1\n@char 83\n#end\n',
    ])
    const chip = makechip()
    const shoot = BOARD_FIRMWARE.getcommand('shoot')!
    shoot(chip, ['e', 'star'])
    expect(chip.flags.didfail).toBe(0)
    const shot = memoryreadelement(board, { x: 6, y: 5 }, READ_LAYER.OBJECT)
    expect(shot).toBeDefined()
    expect(shot?.kind).toBe('star')
    expect(memoryreadelementstat(shot, 'collision')).toBe(COLLISION.ISBULLET)
    expect(memoryreadelementstat(shot, 'breakable')).toBe(0)
  })
})
