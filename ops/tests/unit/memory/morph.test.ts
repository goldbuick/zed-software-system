import type { CHIP } from 'zss/chip'
import { ELEMENT_FIRMWARE } from 'zss/firmware/element'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
  memorywriteterrainfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorymorphboardobject } from 'zss/memory/boards'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryhaltallchips } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { READ_CONTEXT } from 'zss/words/reader'

const HEAD_CODE = ['@head', '@char 233', '@cycle 2', '#end', ''].join('\n')
const SEGMENT_CODE = ['@segment', '@char 79', '@cycle 2', '#end', ''].join(
  '\n',
)
const WALL_CODE = ['@terrain wall', '@char 178', ''].join('\n')

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

describe('memorymorphboardobject', () => {
  afterEach(() => {
    memoryboundariesclear()
    memoryhaltallchips()
    memoryresetbooks([])
    READ_CONTEXT.board = undefined
    READ_CONTEXT.book = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
  })

  function setup() {
    const headpage = memorycreatecodepage(HEAD_CODE, {})
    const segpage = memorycreatecodepage(SEGMENT_CODE, {})
    const wallpage = memorycreatecodepage(WALL_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([headpage, segpage, wallpage, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memorycreateboard()
    board.id = boardpage.id
    memoryensureboardready(board)
    return { book, board, headpage, segpage }
  }

  it('preserves id and p3/p4, swaps code and char, does not remove', () => {
    const { board, headpage } = setup()
    const seg = memorycreateboardobjectfromkind(
      board,
      { x: 4, y: 5 },
      'segment',
      'oid_seg',
    )!
    seg.p3 = 'follower-id'
    seg.p4 = 'leader-id'
    seg.p5 = 1
    seg.cycle = 7
    seg.stepx = 1
    seg.stepy = 0
    seg.color = 9

    const ok = memorymorphboardobject(board, seg, ['head'])
    expect(ok).toBe(true)
    expect(seg.id).toBe('oid_seg')
    expect(seg.kind).toBe('head')
    expect(seg.removed).toBeUndefined()
    expect(seg.p3).toBe('follower-id')
    expect(seg.p4).toBe('leader-id')
    expect(seg.p5).toBe(1)
    expect(seg.cycle).toBe(7)
    expect(seg.stepx).toBe(1)
    expect(seg.stepy).toBe(0)
    expect(seg.code).toBe(headpage.code)
    expect(seg.char).toBe(233)
    expect(board.objects.oid_seg).toBe(seg)
  })

  it('rejects terrain target kind', () => {
    const { board } = setup()
    const seg = memorycreateboardobjectfromkind(
      board,
      { x: 1, y: 1 },
      'segment',
      'oid_seg',
    )!
    expect(memorymorphboardobject(board, seg, ['wall'])).toBe(false)
    expect(seg.kind).toBe('segment')
  })

  it('rejects terrain element', () => {
    const { board } = setup()
    const terrain = memorywriteterrainfromkind(board, { x: 2, y: 2 }, 'wall')
    expect(memorymorphboardobject(board, terrain, ['head'])).toBe(false)
  })

  it('rejects missing kind', () => {
    const { board } = setup()
    const seg = memorycreateboardobjectfromkind(
      board,
      { x: 3, y: 3 },
      'segment',
      'oid_seg',
    )!
    expect(memorymorphboardobject(board, seg, ['nosuchkind'])).toBe(false)
    expect(seg.kind).toBe('segment')
  })
})

describe('element #morph', () => {
  afterEach(() => {
    memoryboundariesclear()
    memoryhaltallchips()
    memoryresetbooks([])
    READ_CONTEXT.board = undefined
    READ_CONTEXT.book = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
  })

  it('sets didfail when morphing into terrain kind', () => {
    const headpage = memorycreatecodepage(HEAD_CODE, {})
    const wallpage = memorycreatecodepage(WALL_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([headpage, wallpage, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memorycreateboard()
    board.id = boardpage.id
    memoryensureboardready(board)
    const el = memorycreateboardobjectfromkind(
      board,
      { x: 0, y: 0 },
      'head',
      'oid_h',
    )!
    READ_CONTEXT.book = book
    READ_CONTEXT.board = board
    READ_CONTEXT.element = el
    READ_CONTEXT.elementid = el.id ?? ''

    const chip = makechip()
    const handler = ELEMENT_FIRMWARE.getcommand('morph')
    expect(handler).toBeDefined()
    handler!(chip, ['wall'])
    expect(chip.flags.didfail).toBe(1)
    expect(el.kind).toBe('head')
  })
})
