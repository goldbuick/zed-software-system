import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { handleackboardrunner } from 'zss/device/vm/handlers/ackboardrunner'
import * as helpers from 'zss/device/vm/helpers'
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

  beforeEach(() => {
    clearboardrunnerstate()
    sendsnapshot = jest
      .spyOn(helpers, 'vmboardrunnersendsnapshot')
      .mockImplementation(() => {})
  })

  afterEach(() => {
    clearboardrunnerstate()
    jest.restoreAllMocks()
  })

  it('records ack and sends board snapshot for valid runner', () => {
    boardrunners['board-a'] = 'player-1'
    const message = {
      data: 'board-a',
      player: 'player-1',
    } as MESSAGE

    handleackboardrunner(vm, message)

    expect(ackboardrunners['board-a']).toBe('player-1')
    expect(sendsnapshot).toHaveBeenCalledWith(vm, 'player-1', 'board-a')
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
  })

  it('ignores non-string board id', () => {
    boardrunners['board-a'] = 'player-1'
    const message = {
      data: 1,
      player: 'player-1',
    } as unknown as MESSAGE

    handleackboardrunner(vm, message)

    expect(sendsnapshot).not.toHaveBeenCalled()
  })
})
