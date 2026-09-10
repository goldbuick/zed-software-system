import type { CHIP } from 'zss/chip'
import { ELEMENT_FIRMWARE } from 'zss/firmware/element'
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
import { BOARD_WIDTH } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { CATEGORY } from 'zss/words/types'

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

  it('preserves id and stats, drops code, keeps instance char', () => {
    const { board } = setup()
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
    seg.char = 79
    seg.code = 'instance override'

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
    expect(seg.color).toBe(9)
    expect(seg.char).toBe(79)
    expect(seg.code).toBeUndefined()
    expect(seg?.kinddata?.name).toBe('head')
    expect(board.objects.oid_seg).toBe(seg)
  })

  it('morphs object into terrain kind on the terrain layer', () => {
    const { board } = setup()
    const seg = memorycreateboardobjectfromkind(
      board,
      { x: 4, y: 5 },
      'segment',
      'oid_seg',
    )!
    seg.color = 9
    seg.char = 79
    seg.p1 = 3

    const ok = memorymorphboardobject(board, seg, ['wall'])
    expect(ok).toBe(true)
    expect(board.objects.oid_seg).toBeUndefined()
    const index = 4 + 5 * BOARD_WIDTH
    const tile = board.terrain[index]
    expect(tile).toBe(seg)
    expect(tile?.id).toBeUndefined()
    expect(tile?.kind).toBe('wall')
    expect(tile?.code).toBeUndefined()
    expect(tile?.color).toBe(9)
    expect(tile?.char).toBe(79)
    expect(tile?.p1).toBe(3)
    expect(tile?.category).toBe(
      CATEGORY.ISTERRAIN,
    )
    expect(tile?.kinddata?.name).toBe('wall')
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
    memoryhaltallchips()
    memoryresetbooks([])
    READ_CONTEXT.board = undefined
    READ_CONTEXT.book = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
  })

  it('succeeds when morphing into terrain kind', () => {
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
    expect(chip.flags.didfail).toBe(0)
    expect(board.objects.oid_h).toBeUndefined()
    expect(board.terrain[0]?.kind).toBe('wall')
  })
})
