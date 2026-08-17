import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreateboardobjectfromkind,
  memorysafedeleteelement,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import {
  memorycreatebook,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memorytickobject } from 'zss/memory/runtime'
import { memoryreadboardruntime } from 'zss/memory/runtimeboundary'
import { memoryresetbooks, memorywritesoftwarebook } from 'zss/memory/session'
import { BOARD_WIDTH, CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'
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

  it('dies and clears lookup after walking into board edge', () => {
    const bulletpage = memorycreatecodepage(BULLET_CODE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([bulletpage, boardpage])
    memoryresetbooks([book])
    memorywritesoftwarebook('main', book.id)

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
    const idx = 5 + 0 * BOARD_WIDTH
    expect(memoryreadboardruntime(board)?.lookup?.[idx]).toBeUndefined()
  })
})
