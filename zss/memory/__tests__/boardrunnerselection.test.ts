import { BOARDRUNNER_ACK_FAIL_COUNT } from 'zss/device/vm/state'
import * as boards from 'zss/memory/boards'
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

  it('hard-locks acked runner even when joiner has much lower tracking', () => {
    const book = stubbook(['op', 'joiner'], {
      op: 'addr-a',
      joiner: 'addr-a',
    })
    const t = { op: 100, joiner: 1 }
    const acked = { 'addr-a': 'op' }
    expect(memoryreadboardrunnerchoices(book, t, undefined, acked)).toEqual({
      runnerchoices: { 'addr-a': 'op' },
      playeridsbyboard: { 'addr-a': ['op', 'joiner'] },
    })
  })

  it('picks lowest tracking among players not acked on another board', () => {
    // p2 is still listed as acked for addr-b (e.g. stale) while their book
    // flag says addr-a — they must not be chosen for addr-a.
    const book = stubbook(['p1', 'p2'], { p1: 'addr-a', p2: 'addr-a' })
    const t = { p1: 5, p2: 1 }
    const acked = { 'addr-b': 'p2' }
    expect(memoryreadboardrunnerchoices(book, t, undefined, acked)).toEqual({
      runnerchoices: { 'addr-a': 'p1' },
      playeridsbyboard: { 'addr-a': ['p1', 'p2'] },
    })
  })

  it('drops phantom acked runner who has since left the board', () => {
    // acked runner `ghost` is no longer on addr-a. The election should
    // not reference them at all.
    const book = stubbook(['op'], { op: 'addr-a' })
    const t = { op: 5, ghost: 0 }
    const acked = { 'addr-a': 'ghost' }
    expect(memoryreadboardrunnerchoices(book, t, undefined, acked)).toEqual({
      runnerchoices: { 'addr-a': 'op' },
      playeridsbyboard: { 'addr-a': ['op'] },
    })
  })

  it('splits playeridsbyboard when one player moves to another board (stub state)', () => {
    const book = stubbook(['host', 'joiner'], {
      host: 'addr-b',
      joiner: 'addr-a',
    })
    const t = { host: 3, joiner: 4 }
    expect(memoryreadboardrunnerchoices(book, t)).toEqual({
      runnerchoices: { 'addr-a': 'joiner', 'addr-b': 'host' },
      playeridsbyboard: { 'addr-a': ['joiner'], 'addr-b': ['host'] },
    })
  })

  it('does not keep acked runner who moved off board when joiner is present', () => {
    const book = stubbook(['joiner'], { joiner: 'addr-a' })
    const t = { oldhost: 1, joiner: 8 }
    const acked = { 'addr-a': 'oldhost' }
    expect(memoryreadboardrunnerchoices(book, t, undefined, acked)).toEqual({
      runnerchoices: { 'addr-a': 'joiner' },
      playeridsbyboard: { 'addr-a': ['joiner'] },
    })
  })
})
