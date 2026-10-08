import type { CHIP } from 'zss/chip'
import { ELEMENT_FIRMWARE } from 'zss/firmware/element'
import { memorycreateboardobject } from 'zss/memory/boardlifecycle'
import { memoryrebuildboardnamed } from 'zss/memory/boardlookup'
import { memoryreadelementkind } from 'zss/memory/boards'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memoryhaltallchips } from 'zss/memory/runtime'
import { memoryresetbooks, memorywritemainbook } from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'

const OBJECT_PAGE = `@object
@code zssedit;edit object code
' do not edit
`

const L_CODE = `@l
#cycle 1
#end
:_do
/e
#end
:do2
#die
:vibe
?w?e
#end
`

describe('#bind composite object', () => {
  afterEach(() => {
    READ_CONTEXT.board = undefined
    READ_CONTEXT.book = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
    READ_CONTEXT.words = []
    memoryhaltallchips()
    memoryresetbooks([])
  })

  it('copies kind and the @l script onto an unnamed binder', () => {
    const page = memorycreatecodepage(OBJECT_PAGE, {})
    const boardpage = memorycreatecodepage('@board arena\n', {})
    const book = memorycreatebook([page, boardpage])
    memoryresetbooks([book])
    memorywritemainbook(book.id)
    const board = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpage)!
    board.id = boardpage.id

    const leader = memorycreateboardobject(board, {
      x: 4,
      y: 4,
      kind: 'object',
      id: 'oid_l',
      code: L_CODE,
    })!
    const binder = memorycreateboardobject(board, {
      x: 5,
      y: 4,
      id: 'oid_bind',
      code: '#bind l',
    })!
    memoryrebuildboardnamed(board)

    READ_CONTEXT.book = book
    READ_CONTEXT.board = board
    READ_CONTEXT.element = binder
    READ_CONTEXT.elementid = binder.id ?? ''

    const handler = ELEMENT_FIRMWARE.getcommand('bind')
    handler!({} as CHIP, ['l'])

    expect(binder.code).toBe(L_CODE)
    expect(binder.kind).toBe('object')
    expect(binder.name).toBe('l')
    expect(binder.kinddata).toBeUndefined()

    const leaderkind = memoryreadelementkind(leader)
    const binderkind = memoryreadelementkind(binder)
    const leadertick = `${leaderkind?.code ?? ''}\n${leader.code ?? ''}`
    const bindertick = `${binderkind?.code ?? ''}\n${binder.code ?? ''}`
    expect(bindertick).toBe(leadertick)
    expect(leadertick.startsWith(OBJECT_PAGE.trim())).toBe(true)
    expect(bindertick.endsWith(L_CODE)).toBe(true)
  })
})
