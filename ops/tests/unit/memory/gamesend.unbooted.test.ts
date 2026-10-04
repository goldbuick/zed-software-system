import { compilescript } from 'zss/feature/lang/langcompileclient'
import { cleartickreadcontextall } from 'zss/firmware/runtime'
import { memorycreateboardobjectfromkind } from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memorysendtoelement } from 'zss/memory/gamesend'
import { memoryhaltallchips, memorytickobject } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'

const BOMB = `@bomb
@cycle 12
#set p1 1
#end
:touch
#set p1 7
#end
`

describe('send before first tick', () => {
  afterEach(() => {
    cleartickreadcontextall()
    memoryhaltallchips()
    memoryresetbooks([])
  })

  it('runs the queued label on the first tick', () => {
    const build = compilescript('bomb', BOMB)
    expect(build.errors ?? []).toEqual([])
    const page = memorycreatecodepage(BOMB, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([page, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id
    memoryensureboardready(board)
    const bomb = memorycreateboardobjectfromkind(
      board,
      { x: 4, y: 4 },
      'bomb',
      'oid_bomb',
    )!
    book.timestamp = 100
    READ_CONTEXT.book = book
    READ_CONTEXT.board = board
    READ_CONTEXT.timestamp = 100
    memorysendtoelement(
      { id: 'oid_sender', x: 1, y: 1, kind: 'object' },
      bomb,
      'touch',
    )
    expect(bomb.p1).not.toBe(7)
    const kindcode = `${bomb.kinddata?.code ?? ''}\n${bomb.code ?? ''}`
    memorytickobject(book, board, bomb, kindcode)
    expect(bomb.p1).toBe(7)
  })
})
