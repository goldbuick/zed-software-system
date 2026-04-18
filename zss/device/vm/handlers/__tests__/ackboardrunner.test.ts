import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import { handleackboardrunner } from 'zss/device/vm/handlers/ackboardrunner'
import * as helpers from 'zss/device/vm/helpers'
import * as memorysync from 'zss/device/vm/memorysync'
import { ackboardrunners, boardrunners } from 'zss/device/vm/state'

function clearboardrunnerstate() {
  for (const k of Object.keys(boardrunners)) {
    delete boardrunners[k]
  }
  for (const k of Object.keys(ackboardrunners)) {
    delete ackboardrunners[k]
  }
}

describe('handleackboardrunner', () => {
  const vm = {} as DEVICE
  let sendsnapshot: jest.SpyInstance
  let revoke: jest.SpyInstance
  let owned: jest.SpyInstance

  beforeEach(() => {
    clearboardrunnerstate()
    sendsnapshot = jest
      .spyOn(helpers, 'boardrunnersendsnapshot')
      .mockImplementation(() => {})
    revoke = jest
      .spyOn(memorysync, 'memorysyncrevokeboardrunner')
      .mockImplementation(() => {})
    owned = jest.spyOn(api, 'boardrunnerowned').mockImplementation(() => {})
  })

  afterEach(() => {
    clearboardrunnerstate()
    jest.restoreAllMocks()
  })

  it('records ack, emits ownership, and sends board snapshot for valid runner', () => {
    boardrunners['board-a'] = 'player-1'
    const message = {
      data: 'board-a',
      player: 'player-1',
    } as MESSAGE

    handleackboardrunner(vm, message)

    expect(ackboardrunners['board-a']).toBe('player-1')
    expect(sendsnapshot).toHaveBeenCalledWith('player-1', 'board-a')
    expect(owned).toHaveBeenCalledWith(vm, 'player-1', ['board-a'])
    expect(revoke).not.toHaveBeenCalled()
  })

  it('revokes previous owner and emits refreshed ownership sets on flip', () => {
    boardrunners['board-a'] = 'player-2'
    ackboardrunners['board-a'] = 'player-1'
    const message = {
      data: 'board-a',
      player: 'player-2',
    } as MESSAGE

    handleackboardrunner(vm, message)

    expect(revoke).toHaveBeenCalledWith('player-1', 'board-a')
    // Old owner gets an empty ownership set now that they lost the board.
    expect(owned).toHaveBeenCalledWith(vm, 'player-1', [])
    // New owner gets the board they just acked.
    expect(owned).toHaveBeenCalledWith(vm, 'player-2', ['board-a'])
    expect(ackboardrunners['board-a']).toBe('player-2')
  })

  it('ignores ack from non-runner', () => {
    boardrunners['board-a'] = 'player-1'
    const message = {
      data: 'board-a',
      player: 'other',
    } as MESSAGE

    handleackboardrunner(vm, message)

    expect(ackboardrunners['board-a']).toBeUndefined()
    expect(sendsnapshot).not.toHaveBeenCalled()
    expect(owned).not.toHaveBeenCalled()
    expect(revoke).not.toHaveBeenCalled()
  })

  it('ignores non-string board id', () => {
    boardrunners['board-a'] = 'player-1'
    const message = {
      data: 1,
      player: 'player-1',
    } as unknown as MESSAGE

    handleackboardrunner(vm, message)

    expect(sendsnapshot).not.toHaveBeenCalled()
    expect(owned).not.toHaveBeenCalled()
  })

  it('does not revoke when re-acking the same player (idempotent)', () => {
    boardrunners['board-a'] = 'player-1'
    ackboardrunners['board-a'] = 'player-1'
    const message = {
      data: 'board-a',
      player: 'player-1',
    } as MESSAGE

    handleackboardrunner(vm, message)

    expect(revoke).not.toHaveBeenCalled()
    expect(ackboardrunners['board-a']).toBe('player-1')
  })
})
