import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { handlepeergone } from 'zss/device/vm/handlers/peergone'
import {
  ackboardrunners,
  boardrunners,
  failedboardrunners,
} from 'zss/device/vm/state'

function clearboardrunnerstate() {
  for (const k of Object.keys(boardrunners)) {
    delete boardrunners[k]
  }
  for (const k of Object.keys(ackboardrunners)) {
    delete ackboardrunners[k]
  }
  for (const k of Object.keys(failedboardrunners)) {
    delete failedboardrunners[k]
  }
}

describe('handlepeergone', () => {
  const vm = { emit: jest.fn() } as unknown as DEVICE

  beforeEach(() => {
    clearboardrunnerstate()
  })

  afterEach(() => {
    clearboardrunnerstate()
  })

  it('clears boardrunners and ackboardrunners entries for the gone peer', () => {
    boardrunners['board-a'] = 'player-gone'
    ackboardrunners['board-a'] = 'player-gone'
    boardrunners['board-b'] = 'player-stays'
    ackboardrunners['board-b'] = 'player-stays'

    const message = { player: 'player-gone' } as MESSAGE

    handlepeergone(vm, message)

    expect(boardrunners['board-a']).toBeUndefined()
    expect(ackboardrunners['board-a']).toBeUndefined()
    expect(boardrunners['board-b']).toBe('player-stays')
    expect(ackboardrunners['board-b']).toBe('player-stays')
  })

  it('clears failedboardrunners entries for the gone peer', () => {
    boardrunners['board-a'] = 'someone-else'
    failedboardrunners['board-a'] = { 'player-gone': 2, other: 1 }

    const message = { player: 'player-gone' } as MESSAGE

    handlepeergone(vm, message)

    expect(failedboardrunners['board-a']['player-gone']).toBeUndefined()
    expect(failedboardrunners['board-a'].other).toBe(1)
  })

  it('ignores missing player', () => {
    boardrunners['board-a'] = 'player-a'
    ackboardrunners['board-a'] = 'player-a'

    const message = { player: '' } as MESSAGE

    handlepeergone(vm, message)

    expect(boardrunners['board-a']).toBe('player-a')
    expect(ackboardrunners['board-a']).toBe('player-a')
  })
})
