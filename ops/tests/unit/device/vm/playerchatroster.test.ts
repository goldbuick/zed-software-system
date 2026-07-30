jest.mock('zss/device/api', () => ({
  vmloader: jest.fn(),
}))

jest.mock('zss/memory/flags', () => ({
  memoryreadflags: jest.fn(() => ({ user: 'Alice' })),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadoperator: jest.fn(() => 'op1'),
  memoryreadbookbysoftware: jest.fn(() => ({
    activelist: ['p1', 'p2'],
  })),
}))

import type { DEVICE } from 'zss/device'
import { vmloader } from 'zss/device/api'
import {
  emitchatconnectplayer,
  emitchatdisconnectplayer,
  maybeemitplayerchatroster,
  resetplayerchatrosteremitsfortests,
} from 'zss/device/vm/playerchatroster'
import { lastinputtime } from 'zss/device/vm/state'
import { memoryreadflags } from 'zss/memory/flags'

describe('playerchatroster', () => {
  const vm = {} as DEVICE
  const player = 'p1'

  beforeEach(() => {
    jest.clearAllMocks()
    resetplayerchatrosteremitsfortests()
    for (const key of Object.keys(lastinputtime)) {
      delete lastinputtime[key]
    }
    const now = Date.now()
    lastinputtime.p1 = now
    lastinputtime.p2 = now - 12_000
    lastinputtime.op1 = now - 5_000
    jest.mocked(memoryreadflags).mockImplementation((id: string) => {
      if (id === 'p1') {
        return { user: 'Alice' } as any
      }
      if (id === 'p2') {
        return { user: 'Bob' } as any
      }
      return { user: 'Op' } as any
    })
  })

  it('emitchatconnectplayer uses chat:connect:player then roster', () => {
    emitchatconnectplayer(vm, player)
    expect(vmloader).toHaveBeenCalledWith(
      vm,
      player,
      undefined,
      'text',
      'chat:connect:player',
      'Alice:0',
    )
    expect(vmloader).toHaveBeenCalledWith(
      vm,
      player,
      undefined,
      'text',
      'chat:roster:player',
      expect.any(String),
    )
  })

  it('emitchatdisconnectplayer uses chat:disconnect:player only', () => {
    emitchatdisconnectplayer(vm, player)
    expect(vmloader).toHaveBeenCalledWith(
      vm,
      player,
      undefined,
      'text',
      'chat:disconnect:player',
      'Alice:0',
    )
    expect(vmloader).toHaveBeenCalledTimes(1)
  })

  it('maybeemitplayerchatroster skips unchanged body within throttle', () => {
    maybeemitplayerchatroster(vm, player, true)
    expect(vmloader).toHaveBeenCalledTimes(1)
    maybeemitplayerchatroster(vm, player, false)
    expect(vmloader).toHaveBeenCalledTimes(1)
  })
})
