import { compilescript } from 'zss/feature/lang/langcompileclient'
import { cleartickreadcontextall } from 'zss/firmware/runtime'
import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memoryhaltallchips, memorytickobject } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { BOARD_WIDTH, CODE_PAGE_TYPE } from 'zss/memory/types'
import { COLLISION } from 'zss/words/types'
import { READ_CONTEXT } from 'zss/words/reader'

const WALK_EAST = `@object
@cycle 1
#walk e
#end
`

const WALK_EAST_THUD = `@object
@cycle 1
#walk e
#end
:thud
#set p1 7
#end
`

describe('walk after code', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryhaltallchips()
    memoryresetbooks([])
  })

  function setup(code: string, wall: boolean) {
    const build = compilescript('object', code)
    expect(build.errors ?? []).toEqual([])
    const page = memorycreatecodepage(code, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([page, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    if (wall) {
      board.terrain[6 + 5 * BOARD_WIDTH] = {
        kind: 'solid',
        collision: COLLISION.ISSOLID,
        x: 6,
        y: 5,
      }
    }
    memoryensureboardready(board)
    const object = memorycreateboardobjectfromkind(
      board,
      { x: 5, y: 5 },
      'object',
      'oid_walker',
    )!
    object.cycle = 1
    book.timestamp = 100
    READ_CONTEXT.timestamp = 100
    return { book, board, object }
  }

  it('steps the direction #walk set in the same tick', () => {
    const { book, board, object } = setup(WALK_EAST, false)
    memorytickobject(book, board, object, WALK_EAST)
    expect(object.x).toBe(6)
    expect(object.y).toBe(5)
  })

  it('runs :thud on the tick after a blocked step', () => {
    const { book, board, object } = setup(WALK_EAST_THUD, true)
    memorytickobject(book, board, object, WALK_EAST_THUD)
    expect(object.x).toBe(5)
    expect(object.p1).not.toBe(7)
    memorytickobject(book, board, object, WALK_EAST_THUD)
    expect(object.x).toBe(5)
    expect(object.p1).toBe(7)
  })
})
