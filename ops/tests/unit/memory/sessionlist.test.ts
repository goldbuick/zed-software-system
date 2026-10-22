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
      'no active sessions for this book',
    ])
  })

  it('writes one adminjoin link per session', () => {
    memorywritesessionlist([
      { topic: 'abcd1234', players: 3 },
      { topic: 'efgh5678', players: 1 },
    ])
    expect(memoryreadsessionlist()).toHaveLength(2)
    expect(memorysessionlistlines()).toEqual([
      '!@adminjoin abcd1234;3 players $GREYabcd1234',
      '!@adminjoin efgh5678;1 player $GREYefgh5678',
    ])
  })
})
