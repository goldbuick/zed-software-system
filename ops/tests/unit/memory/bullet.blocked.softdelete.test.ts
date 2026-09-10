import { READ_LAYER, memoryreadelement } from 'zss/memory/boardaccess'
import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memorytickobject } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { BOARD_WIDTH, CODE_PAGE_TYPE } from 'zss/memory/types'
import { COLLISION } from 'zss/words/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { cleartickreadcontextall } from 'zss/firmware/runtime'

/** Chip never #dies. Engine must still soft-delete a breakable bullet on thud. */
const BULLET_CODE_NO_DIE = `@bullet
@cycle 1
@char 248
:think
#idle
#think
`

describe('bullet blocked breakable softdelete', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryresetbooks([])
  })

  it('removes a breakable bullet that walks into solid without chip #die', () => {
    const bulletpage = memorycreatecodepage(BULLET_CODE_NO_DIE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([bulletpage, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)

    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    const wallidx = 4 + 5 * BOARD_WIDTH
    board.terrain[wallidx] = { kind: 'solid', collision: COLLISION.ISSOLID }
    memoryensureboardready(board)

    const bullet = memorycreateboardobjectfromkind(
      board,
      { x: 5, y: 5 },
      'bullet',
      'sid_bullet_wall',
    )
    expect(bullet).toBeDefined()
    bullet!.collision = COLLISION.ISBULLET
    bullet!.breakable = 1
    bullet!.cycle = 1
    bullet!.stepx = -1
    bullet!.stepy = 0
    book.timestamp = 20
    READ_CONTEXT.timestamp = 20

    memorytickobject(book, board, bullet, BULLET_CODE_NO_DIE)

    expect(bullet!.removed).toBe(20)
    expect(
      memoryreadelement(board, { x: 5, y: 5 }, READ_LAYER.OBJECT),
    ).toBeUndefined()
  })

  it('removes both breakable bullets when one walks into the other', () => {
    const bulletpage = memorycreatecodepage(BULLET_CODE_NO_DIE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([bulletpage, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)

    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    memoryensureboardready(board)

    const lead = memorycreateboardobjectfromkind(
      board,
      { x: 8, y: 15 },
      'bullet',
      'sid_bullet_lead',
    )
    const follower = memorycreateboardobjectfromkind(
      board,
      { x: 9, y: 15 },
      'bullet',
      'sid_bullet_follow',
    )
    expect(lead).toBeDefined()
    expect(follower).toBeDefined()
    for (const bullet of [lead, follower]) {
      bullet!.collision = COLLISION.ISBULLET
      bullet!.breakable = 1
      bullet!.cycle = 1
      bullet!.stepx = -1
      bullet!.stepy = 0
    }
    book.timestamp = 30
    READ_CONTEXT.timestamp = 30

    memorytickobject(book, board, follower, BULLET_CODE_NO_DIE)

    expect(follower!.removed).toBe(30)
    expect(lead!.removed).toBe(30)
    expect(
      memoryreadelement(board, { x: 8, y: 15 }, READ_LAYER.OBJECT),
    ).toBeUndefined()
    expect(
      memoryreadelement(board, { x: 9, y: 15 }, READ_LAYER.OBJECT),
    ).toBeUndefined()
  })
})
