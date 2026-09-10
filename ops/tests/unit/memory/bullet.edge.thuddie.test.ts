import { memoryreadobjectatpt } from 'zss/memory/boardaccess'
import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memorytickobject } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { COLLISION } from 'zss/words/types'
import { cleartickreadcontextall } from 'zss/firmware/runtime'

const BULLET_CODE = `@bullet
@cycle 1
@char 248
:think
#idle
#think
:thud
:shot
#die
`

describe('bullet edge thud die', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryresetbooks([])
  })

  it('does not remove a non-breakable bullet that walks into board edge', () => {
    const bulletpage = memorycreatecodepage(BULLET_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([bulletpage, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)

    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    memoryensureboardready(board)

    const bullet = memorycreateboardobjectfromkind(
      board,
      { x: 5, y: 0 },
      'bullet',
      'sid_bullet_edge',
    )
    expect(bullet).toBeDefined()
    bullet!.collision = COLLISION.ISBULLET
    bullet!.cycle = 1
    bullet!.stepx = 0
    bullet!.stepy = -1
    book.timestamp = 10

    // Edge block sends shot/partyshot to the edge, not :thud to the bullet.
    // Soft-delete only runs for breakable projectiles.
    for (let t = 0; t < 5; t++) {
      book.timestamp = 10 + t
      memorytickobject(book, board, bullet, BULLET_CODE)
    }

    expect(bullet!.removed).toBeUndefined()
    expect(bullet!.x).toBe(5)
    expect(bullet!.y).toBe(0)
    expect(memoryreadobjectatpt(board, { x: 5, y: 0 })?.id).toBe(
      'sid_bullet_edge',
    )
  })
})
