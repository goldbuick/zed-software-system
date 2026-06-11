import {
  memorycollecttickboundaries,
  memoryisboardready,
} from 'zss/memory/boardwait'
import { memoryboundariesclear, memoryboundaryset } from 'zss/memory/boundaries'
import type { BOARD, BOOK, CODE_PAGE_RUNTIME } from 'zss/memory/types'

describe('boardwait', () => {
  const book = { flags: {} } as BOOK
  const boarda: BOARD = {
    id: 'board-a',
    name: 'board-a',
    terrain: [],
    objects: {},
  }

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

  it('memorycollecttickboundaries collects boundary ids only for hydrated boards', () => {
    const boardb: BOARD = {
      id: 'board-b',
      name: 'board-b',
      terrain: [],
      objects: {},
    }
    memoryboundaryset('board-a', {} as CODE_PAGE_RUNTIME)
    memoryboundaryset('board-b', { board: boardb } as CODE_PAGE_RUNTIME)
    const ids = memorycollecttickboundaries(book, ['board-a', 'board-b'])
    expect(ids).not.toContain('board-a')
    expect(ids).toContain('board-b')
  })
})
