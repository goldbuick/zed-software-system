import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import { handlesecond } from 'zss/device/vm/handlers/second'
import {
  BOARDRUNNER_ACK_FAIL_COUNT,
  ackboardrunners,
  boardrunners,
  failedboardrunners,
  setflushtick,
} from 'zss/device/vm/state'
import * as playermanagement from 'zss/memory/playermanagement'
import * as session from 'zss/memory/session'

function clearboardrunnerrecords() {
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

describe('handlesecond board runner ack retries', () => {
  const vm = {} as DEVICE
  const message = { player: '' } as MESSAGE
  let registerask: jest.SpyInstance

  beforeEach(() => {
    clearboardrunnerrecords()
    setflushtick(0)
    session.memorywritesimfreeze(false)
    jest.spyOn(playermanagement, 'memoryscanplayers').mockImplementation(() => {})
    registerask = jest
      .spyOn(api, 'registerboardrunnerask')
      .mockImplementation(() => {})
    jest.spyOn(api, 'vmlogout').mockImplementation(() => {})
  })

  afterEach(() => {
    clearboardrunnerrecords()
    setflushtick(0)
    session.memorywritesimfreeze(false)
    jest.restoreAllMocks()
  })

  it('increments retry count on each ask and clears runner at fail count', () => {
    boardrunners['board-x'] = 'player-a'
    failedboardrunners['board-x'] = { 'player-a': 0 }

    handlesecond(vm, message)

    expect(registerask).toHaveBeenCalledWith(vm, 'player-a', 'board-x')
    expect(failedboardrunners['board-x']?.['player-a']).toBe(1)
    expect(boardrunners['board-x']).toBe('player-a')

    handlesecond(vm, message)

    expect(registerask).toHaveBeenCalledTimes(2)
    expect(failedboardrunners['board-x']?.['player-a']).toBe(
      BOARDRUNNER_ACK_FAIL_COUNT,
    )
    expect(boardrunners['board-x']).toBeUndefined()
    expect(ackboardrunners['board-x']).toBeUndefined()
  })

  it('does not retry when ack matches current runner', () => {
    boardrunners['board-x'] = 'player-a'
    failedboardrunners['board-x'] = { 'player-a': 0 }
    ackboardrunners['board-x'] = 'player-a'

    handlesecond(vm, message)

    expect(registerask).not.toHaveBeenCalled()
    expect(failedboardrunners['board-x']?.['player-a']).toBe(0)
  })

  it('skips board runner retries when sim is frozen', () => {
    boardrunners['board-x'] = 'player-a'
    failedboardrunners['board-x'] = { 'player-a': 0 }
    session.memorywritesimfreeze(true)

    handlesecond(vm, message)

    expect(registerask).not.toHaveBeenCalled()
    expect(failedboardrunners['board-x']?.['player-a']).toBe(0)
  })
})
