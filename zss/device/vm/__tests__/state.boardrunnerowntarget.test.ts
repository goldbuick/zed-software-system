import {
  ackboardrunners,
  boardrunners,
  playerboardrunnerowntarget,
  playerownedboard,
} from 'zss/device/vm/state'

describe('playerboardrunnerowntarget', () => {
  afterEach(() => {
    for (const k of Object.keys(boardrunners)) {
      delete boardrunners[k]
    }
    for (const k of Object.keys(ackboardrunners)) {
      delete ackboardrunners[k]
    }
  })

  it('returns board when elected but not yet acked', () => {
    boardrunners['board-x'] = 'joiner'
    expect(playerownedboard('joiner')).toBe('')
    expect(playerboardrunnerowntarget('joiner')).toBe('board-x')
  })

  it('matches playerownedboard when only acked', () => {
    ackboardrunners['board-a'] = 'p1'
    expect(playerboardrunnerowntarget('p1')).toBe('board-a')
    expect(playerownedboard('p1')).toBe('board-a')
  })
})
