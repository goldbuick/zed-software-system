jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  boardrunneridle: jest.fn(),
  registerloginready: jest.fn(),
  vmclearscroll: jest.fn(),
}))

jest.mock('zss/device/boardrunner/sync', () => ({
  pushworkerupdates: jest.fn(),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memorylogoutplayer: jest.fn(),
  memoryreadplayerboard: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadboardrunner: jest.fn(),
}))

import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apilog,
  boardrunneridle,
  registerloginready,
  vmclearscroll,
} from 'zss/device/api'
import { handlelinkdead } from 'zss/device/boardrunner/handlers/linkdead'
import { pushworkerupdates } from 'zss/device/boardrunner/sync'
import {
  memorylogoutplayer,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import { memoryreadboardrunner } from 'zss/memory/session'

describe('handlelinkdead', () => {
  const device = {} as DEVICE

  beforeEach(() => {
    jest.mocked(memoryreadplayerboard).mockReturnValue({
      id: 'board-1',
    } as ReturnType<typeof memoryreadplayerboard> extends infer T
      ? NonNullable<T>
      : never)
    jest.mocked(memoryreadboardrunner).mockReturnValue('dead-player')
    jest.clearAllMocks()
  })

  it('ignores non-string payload', () => {
    handlelinkdead(device, {
      player: 'x',
      data: 123,
    } as MESSAGE)
    expect(memorylogoutplayer).not.toHaveBeenCalled()
  })

  it('logs out player and clears scroll state', () => {
    handlelinkdead(device, {
      player: 'host',
      data: 'dead-player',
    } as MESSAGE)

    expect(memorylogoutplayer).toHaveBeenCalledWith('dead-player')
    expect(pushworkerupdates).toHaveBeenCalledWith(device)
    expect(boardrunneridle).toHaveBeenCalledWith(
      device,
      'dead-player',
      'logout',
    )
    expect(vmclearscroll).toHaveBeenCalledWith(device, 'dead-player')
    expect(registerloginready).toHaveBeenCalledWith(device, 'dead-player')
    expect(apilog).toHaveBeenCalled()
  })
})
