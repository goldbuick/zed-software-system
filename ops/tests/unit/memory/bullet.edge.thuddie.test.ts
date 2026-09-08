import { memoryreadobjectatpt } from 'zss/memory/boardaccess'
import { memoryboundariesclear } from 'zss/memory/boundaries'
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
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('dies and clears occupancy after walking into board edge', () => {
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

    // several ticks: everytick walks into edge, once should process :thud #die
    for (let t = 0; t < 5; t++) {
      book.timestamp = 10 + t
      memorytickobject(book, board, bullet, BULLET_CODE)
      if (bullet!.removed) {
        break
      }
    }

    expect(bullet!.removed).toBeDefined()
    expect(memoryreadobjectatpt(board, { x: 5, y: 0 })).toBeUndefined()
  })
})
