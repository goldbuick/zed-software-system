import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'
import { readexpr } from 'zss/words/expr'
import { READ_CONTEXT } from 'zss/words/reader'

const NEAR = 'pid_nearplayer01'
const FAR = 'pid_farplayer002'
const QUERY = 'oid_queryobject'

describe('any player focus', () => {
  afterEach(() => {
    READ_CONTEXT.book = undefined
    READ_CONTEXT.board = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
    READ_CONTEXT.elementfocus = ''
    READ_CONTEXT.words = []
    memoryresetbooks([])
  })

  function setupboard() {
    const playerpage = memorycreatecodepage('@player\n', {})
    const gempage = memorycreatecodepage('@gem\n', {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([playerpage, gempage, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    memoryensureboardready(board)

    const query = memorycreateboardobjectfromkind(
      board,
      { x: 5, y: 5 },
      'gem',
      QUERY,
    )!
    memorycreateboardobjectfromkind(
      board,
      { x: 6, y: 5 },
      MEMORY_LABEL.PLAYER,
      NEAR,
    )
    memorycreateboardobjectfromkind(
      board,
      { x: 20, y: 20 },
      MEMORY_LABEL.PLAYER,
      FAR,
    )

    READ_CONTEXT.book = book
    READ_CONTEXT.board = board
    READ_CONTEXT.element = query
    READ_CONTEXT.elementid = QUERY
    READ_CONTEXT.elementfocus = ''
    return { board, query }
  }

  it('writes player and elementfocus to the nearest player on any player', () => {
    const { query } = setupboard()
    READ_CONTEXT.words = ['any', 'player']
    const [value] = readexpr(0)
    expect(Array.isArray(value) && value.length).toBeGreaterThan(0)
    expect(query.player).toBe(NEAR)
    expect(READ_CONTEXT.elementfocus).toBe(NEAR)
  })

  it('does not write when directed any misses', () => {
    const { query } = setupboard()
    // north of (5,5) is empty
    READ_CONTEXT.words = ['any', 'n', 'player']
    const [value] = readexpr(0)
    expect(value).toEqual([])
    expect(query.player).toBeUndefined()
    expect(READ_CONTEXT.elementfocus).toBe('')
  })

  it('does not write when matching a non-player kind', () => {
    const { board, query } = setupboard()
    memorycreateboardobjectfromkind(board, { x: 4, y: 5 }, 'gem', 'oid_gem2')
    READ_CONTEXT.words = ['any', 'gem']
    const [value] = readexpr(0)
    expect(Array.isArray(value) && value.length).toBeGreaterThan(0)
    expect(query.player).toBeUndefined()
    expect(READ_CONTEXT.elementfocus).toBe('')
  })
})
