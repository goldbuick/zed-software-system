import {
  memoryboundariesclear,
  memoryboundaryset,
} from 'zss/memory/boundaries'
import {
  memorycollecttickboundaries,
  memoryisboardready,
} from 'zss/memory/boardwait'
import type { BOARD, BOOK, CODE_PAGE_RUNTIME } from 'zss/memory/types'

describe('boardwait', () => {
  const book = { flags: {} } as BOOK
  const boarda: BOARD = {
    id: 'board-a',
    terrain: [],
    objects: {},
  } as BOARD

  beforeEach(() => {
    memoryboundariesclear()
  })

  it('memoryisboardruntimehydrated is false without board payload', () => {
    memoryboundaryset('board-a', {} as CODE_PAGE_RUNTIME)
    expect(memoryisboardready('board-a')).toBe(false)
  })

  it('memoryisboardruntimehydrated is true when runtime has board', () => {
    memoryboundaryset('board-a', { board: boarda } as CODE_PAGE_RUNTIME)
    expect(memoryisboardready('board-a')).toBe(true)
  })

  it('memorycollecttickboundaries always includes listed codepage ids', () => {
    memoryboundaryset('board-a', {} as CODE_PAGE_RUNTIME)
    memoryboundaryset('board-b', {} as CODE_PAGE_RUNTIME)
    const ids = memorycollecttickboundaries(book, ['board-a', 'board-b'])
    expect(ids).toContain('board-a')
    expect(ids).toContain('board-b')
  })
})
