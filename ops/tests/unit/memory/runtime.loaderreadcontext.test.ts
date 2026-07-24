import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import {
  memoryloader,
  memoryloaderreadcontextapply,
  memoryloaderreadcontextsave,
  memoryloaderrelease,
} from 'zss/memory/loader'
import {
  memoryreadloaders,
  memoryresetbooks,
  memorywriteoperator,
} from 'zss/memory/session'
import { BOARD, BOARD_ELEMENT } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'

function seedloaderchip(): string {
  const page = memorycreatecodepage(
    '@loader persistctx\n@format testfmt\n@event testevt\n#idle',
    {},
  )
  const book = memorycreatebook([page])
  book.name = 'main'
  memoryresetbooks([book])
  memoryloader('', 'testfmt', 'testevt', null, 'player1')
  const ids = Object.keys(memoryreadloaders())
  expect(ids.length).toBe(1)
  return ids[0]
}

describe('loader READ_CONTEXT snapshot', () => {
  const board = { id: 'board-a' } as BOARD
  const element = { id: 'obj-1', x: 2, y: 3, kind: 'torch' } as BOARD_ELEMENT

  beforeEach(() => {
    memorywriteoperator('operator1')
  })

  afterEach(() => {
    const loaders = memoryreadloaders()
    for (const id of Object.keys(loaders)) {
      memoryloaderrelease(id)
      delete loaders[id]
    }
    memoryresetbooks([])
    READ_CONTEXT.board = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
    READ_CONTEXT.elementisplayer = false
    READ_CONTEXT.elementfocus = ''
  })

  it('apply uses operator defaults when no snapshot exists', () => {
    const id = seedloaderchip()
    READ_CONTEXT.board = board
    memoryloaderreadcontextapply(id)
    expect(READ_CONTEXT.board).toBeUndefined()
    expect(READ_CONTEXT.elementfocus).toBe('operator1')
    memoryloaderrelease(id)
  })

  it('save and apply round-trip board/object targeting fields', () => {
    const id = seedloaderchip()
    READ_CONTEXT.board = board
    READ_CONTEXT.element = element
    READ_CONTEXT.elementid = 'obj-1'
    READ_CONTEXT.elementisplayer = true
    READ_CONTEXT.elementfocus = 'obj-1'

    memoryloaderreadcontextsave(id)

    READ_CONTEXT.board = undefined
    READ_CONTEXT.element = undefined
    READ_CONTEXT.elementid = ''
    READ_CONTEXT.elementisplayer = false
    READ_CONTEXT.elementfocus = ''

    memoryloaderreadcontextapply(id)

    expect(READ_CONTEXT.board).toBe(board)
    expect(READ_CONTEXT.element).toBe(element)
    expect(READ_CONTEXT.elementid).toBe('obj-1')
    expect(READ_CONTEXT.elementisplayer).toBe(true)
    expect(READ_CONTEXT.elementfocus).toBe('obj-1')
  })

  it('release clears persisted snapshot for the loader id', () => {
    const id = seedloaderchip()
    READ_CONTEXT.board = board
    memoryloaderreadcontextsave(id)
    memoryloaderrelease(id)

    READ_CONTEXT.board = board
    memoryloaderreadcontextapply(id)
    expect(READ_CONTEXT.board).toBeUndefined()
  })
})
