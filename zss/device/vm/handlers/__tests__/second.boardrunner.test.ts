import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import { handlesecond } from 'zss/device/vm/handlers/second'
import * as memorysync from 'zss/device/vm/memorysync'
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
  let boardrunnerowned: jest.SpyInstance
  let revoke: jest.SpyInstance

  beforeEach(() => {
    clearboardrunnerrecords()
    setflushtick(0)
    session.memorywritefreeze(false)
    jest.spyOn(console, 'info').mockImplementation(() => {})
    jest
      .spyOn(playermanagement, 'memoryscanplayers')
      .mockImplementation(() => {})
    registerask = jest
      .spyOn(api, 'registerboardrunnerask')
      .mockImplementation(() => {})
    boardrunnerowned = jest
      .spyOn(api, 'boardrunnerowned')
      .mockImplementation(() => {})
    revoke = jest
      .spyOn(memorysync, 'memorysyncrevokeboardrunner')
      .mockImplementation(() => {})
    jest.spyOn(api, 'vmlogout').mockImplementation(() => {})
  })

  afterEach(() => {
    clearboardrunnerrecords()
    setflushtick(0)
    session.memorywritefreeze(false)
    jest.restoreAllMocks()
  })

  it('increments retry count on each ask and clears runner at fail count', () => {
    boardrunners['board-x'] = 'player-a'
    failedboardrunners['board-x'] = { 'player-a': 0 }

    for (let i = 0; i < BOARDRUNNER_ACK_FAIL_COUNT - 1; ++i) {
      handlesecond(vm, message)
      expect(registerask).toHaveBeenCalledWith(vm, 'player-a', 'board-x')
      expect(boardrunners['board-x']).toBe('player-a')
      expect(failedboardrunners['board-x']?.['player-a']).toBe(i + 1)
    }

    handlesecond(vm, message)

    expect(registerask).toHaveBeenCalledTimes(BOARDRUNNER_ACK_FAIL_COUNT)
    expect(failedboardrunners['board-x']?.['player-a']).toBe(
      BOARDRUNNER_ACK_FAIL_COUNT,
    )
    expect(boardrunners['board-x']).toBeUndefined()
    expect(ackboardrunners['board-x']).toBeUndefined()
    expect(revoke).not.toHaveBeenCalled()
    expect(boardrunnerowned).toHaveBeenCalledWith(vm, 'player-a', '')
  })

  it('revokes prior acked runner and refreshes ownership when unelected runner hits ack fail count', () => {
    // Election moved to joiner but old operator is still the acked runner
    // until joiner acks. If joiner never acks, we must revoke the old ack
    // holder's jsonsync admissions (plan: second-path revoke).
    boardrunners['board-x'] = 'joiner'
    ackboardrunners['board-x'] = 'operator'
    failedboardrunners['board-x'] = { joiner: 0 }

    for (let i = 0; i < BOARDRUNNER_ACK_FAIL_COUNT - 1; ++i) {
      handlesecond(vm, message)
      expect(boardrunners['board-x']).toBe('joiner')
    }

    handlesecond(vm, message)
    expect(failedboardrunners['board-x']?.['joiner']).toBe(
      BOARDRUNNER_ACK_FAIL_COUNT,
    )
    expect(boardrunners['board-x']).toBeUndefined()
    expect(ackboardrunners['board-x']).toBeUndefined()
    expect(revoke).toHaveBeenCalledWith('operator', 'board-x')
    expect(boardrunnerowned).toHaveBeenCalledWith(vm, 'operator', '')
    expect(boardrunnerowned).toHaveBeenCalledWith(vm, 'joiner', '')
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
    session.memorywritefreeze(true)

    handlesecond(vm, message)

    expect(registerask).not.toHaveBeenCalled()
    expect(failedboardrunners['board-x']?.['player-a']).toBe(0)
  })
})
