import * as boards from 'zss/memory/boards'
import { BOARDRUNNER_ACK_FAIL_COUNT } from 'zss/device/vm/state'
import { memoryreadboardrunnerchoices } from 'zss/memory/playermanagement'
import type { BOARD, BOOK } from 'zss/memory/types'

function stubbook(
  activelist: string[],
  boardbyplayer: Record<string, string>,
): BOOK {
  const flags: BOOK['flags'] = {}
  for (let i = 0; i < activelist.length; ++i) {
    const p = activelist[i]
    flags[p] = { board: boardbyplayer[p] }
  }
  return {
    id: 'book',
    name: 'book',
    timestamp: 0,
    activelist,
    pages: [],
    flags,
  }
}

const boarda: BOARD = {
  id: 'board-a',
  name: 'a',
  terrain: [],
  objects: {},
}
const boardb: BOARD = {
  id: 'board-b',
  name: 'b',
  terrain: [],
  objects: {},
}

describe('memoryreadboardrunnerbyboard', () => {
  let spy: jest.SpiedFunction<typeof boards.memoryreadboardbyaddress>

  beforeEach(() => {
    spy = jest
      .spyOn(boards, 'memoryreadboardbyaddress')
      .mockImplementation((addr: string) => {
        if (addr === 'addr-a') {
          return boarda
        }
        if (addr === 'addr-b') {
          return boardb
        }
        return undefined
      })
  })

  afterEach(() => {
    spy.mockRestore()
  })

  it('picks lower tracking on same board', () => {
    const book = stubbook(['p1', 'p2'], { p1: 'addr-a', p2: 'addr-a' })
    const t = { p1: 5, p2: 2 }
    expect(memoryreadboardrunnerchoices(book, t)).toEqual({
      runnerchoices: { 'addr-a': 'p2' },
      playeridsbyboard: { 'addr-a': ['p1', 'p2'] },
    })
  })

  it('ties break by earlier activelist index', () => {
    const book = stubbook(['p1', 'p2'], { p1: 'addr-a', p2: 'addr-a' })
    const t = { p1: 3, p2: 3 }
    expect(memoryreadboardrunnerchoices(book, t)).toEqual({
      runnerchoices: { 'addr-a': 'p1' },
      playeridsbyboard: { 'addr-a': ['p1', 'p2'] },
    })
  })

  it('returns one runner per board', () => {
    const book = stubbook(['p1', 'p2'], { p1: 'addr-a', p2: 'addr-b' })
    const t = { p1: 1, p2: 0 }
    expect(memoryreadboardrunnerchoices(book, t)).toEqual({
      runnerchoices: { 'addr-a': 'p1', 'addr-b': 'p2' },
      playeridsbyboard: { 'addr-a': ['p1'], 'addr-b': ['p2'] },
    })
  })

  it('skips player marked failed for that board', () => {
    const book = stubbook(['p1', 'p2'], { p1: 'addr-a', p2: 'addr-a' })
    const t = { p1: 5, p2: 2 }
    const failed = { 'addr-a': { p2: BOARDRUNNER_ACK_FAIL_COUNT } }
    expect(memoryreadboardrunnerchoices(book, t, failed)).toEqual({
      runnerchoices: { 'addr-a': 'p1' },
      playeridsbyboard: { 'addr-a': ['p1', 'p2'] },
    })
  })
})
