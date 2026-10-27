import {
  memoryreadsessionlist,
  memorysessionlistlines,
  memorywritesessionlist,
} from 'zss/memory/sessionlist'

describe('memory sessionlist', () => {
  afterEach(() => {
    memorywritesessionlist([])
  })

  it('shows the empty line when there are no sessions', () => {
    expect(memorysessionlistlines()).toEqual([
      'no active games for this book',
    ])
  })

  it('writes one inline join link per session', () => {
    ;(globalThis as { location?: { href: string; origin: string } }).location =
      {
        href: 'https://zed.cafe/',
        origin: 'https://zed.cafe',
      }
    memorywritesessionlist([
      { topic: 'abcd1234', players: 3 },
      { topic: 'efgh5678', players: 1 },
    ])
    expect(memoryreadsessionlist()).toHaveLength(2)
    expect(memorysessionlistlines()).toEqual([
      '!openit inline https://zed.cafe/join/#abcd1234;3 players $GREYabcd1234',
      '!openit inline https://zed.cafe/join/#efgh5678;1 player $GREYefgh5678',
    ])
  })
})
