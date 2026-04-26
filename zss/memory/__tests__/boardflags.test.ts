import {
  memorycollectchipmemidsforboard,
  memorytrackingflagsbagid,
} from 'zss/memory/boardflags'
import * as boards from 'zss/memory/boards'
import { memoryresetbooks, memorywritesoftwarebook } from 'zss/memory/session'
import { BOARD, BOOK, MEMORY_LABEL } from 'zss/memory/types'

function makemainbook(): BOOK {
  return {
    id: 'main-bc',
    name: 'main',
    timestamp: 0,
    activelist: ['p1'],
    pages: [],
    flags: {
      el1_chip: { ec: 1 },
    },
  }
}

describe('boardflags', () => {
  beforeEach(() => {
    memoryresetbooks([makemainbook()])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-bc')
  })

  afterEach(() => {
    memoryresetbooks([])
    jest.restoreAllMocks()
  })

  it('memorytrackingflagsbagid matches admit path', () => {
    expect(memorytrackingflagsbagid('boardA')).toBe('boardA_tracking')
  })

  it('memorycollectchipmemidsforboard unions elements and persisted *_chip keys', () => {
    const board: BOARD = {
      id: 'boardA',
      name: 'boardA',
      terrain: [],
      objects: {
        el1: { id: 'el1', kind: 'item', x: 0, y: 0 },
      },
    } as unknown as BOARD
    jest.spyOn(boards, 'memoryreadboardbyaddress').mockReturnValue(board)

    const ids = memorycollectchipmemidsforboard('boardA')
    expect(ids.sort()).toEqual(['el1_chip'].sort())
  })
})
