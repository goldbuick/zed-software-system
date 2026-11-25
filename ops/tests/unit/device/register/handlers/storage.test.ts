const storagewritevar = jest.fn(() => Promise.resolve())
const sessionlistsethostingname = jest.fn()

jest.mock('zss/feature/storage', () => ({
  storagewritevar: (...args: unknown[]) => storagewritevar(...args),
}))

jest.mock('zss/feature/sessionlist/service', () => ({
  sessionlistsethostingname: (...args: unknown[]) =>
    sessionlistsethostingname(...args),
}))

jest.mock('zss/device/api', () => ({
  vmplayertoken: jest.fn(),
}))

jest.mock('zss/device/doasync', () => ({
  doasync: (
    _device: unknown,
    _player: string,
    asyncfunc: () => Promise<void>,
  ) => {
    void asyncfunc()
  },
}))

import type { DEVICE } from 'zss/device'
import {
  handlestickysession,
  handlestickyuser,
  handlestickyvoice,
} from 'zss/device/register/handlers/storage'
import type { MESSAGE } from 'zss/device/types'

describe('handlestickyuser', () => {
  const device = { emit: jest.fn() } as unknown as DEVICE

  beforeEach(() => {
    storagewritevar.mockClear()
  })

  it('writes string values as sticky user', () => {
    handlestickyuser(device, {
      player: 'pid_join',
      data: 'gabe',
    } as MESSAGE)
    expect(storagewritevar).toHaveBeenCalledWith('user', 'gabe')
  })

  it('ignores non-string values', () => {
    handlestickyuser(device, {
      player: 'pid_join',
      data: 1,
    } as MESSAGE)
    handlestickyuser(device, {
      player: 'pid_join',
      data: undefined,
    } as MESSAGE)
    expect(storagewritevar).not.toHaveBeenCalled()
  })
})

describe('handlestickyvoice', () => {
  const device = { emit: jest.fn() } as unknown as DEVICE

  beforeEach(() => {
    storagewritevar.mockClear()
  })

  it('writes string voice hints', () => {
    handlestickyvoice(device, {
      player: 'pid_join',
      data: 'F1',
    } as MESSAGE)
    expect(storagewritevar).toHaveBeenCalledWith('voice', 'F1')
  })

  it('writes numeric voice hints including zero', () => {
    handlestickyvoice(device, {
      player: 'pid_join',
      data: 3,
    } as MESSAGE)
    handlestickyvoice(device, {
      player: 'pid_join',
      data: 0,
    } as MESSAGE)
    expect(storagewritevar).toHaveBeenNthCalledWith(1, 'voice', 3)
    expect(storagewritevar).toHaveBeenNthCalledWith(2, 'voice', 0)
  })

  it('ignores non-string non-number values', () => {
    handlestickyvoice(device, {
      player: 'pid_join',
      data: undefined,
    } as MESSAGE)
    handlestickyvoice(device, {
      player: 'pid_join',
      data: { id: 'x' },
    } as MESSAGE)
    expect(storagewritevar).not.toHaveBeenCalled()
  })
})

describe('handlestickysession', () => {
  const device = { emit: jest.fn() } as unknown as DEVICE

  beforeEach(() => {
    storagewritevar.mockClear()
    sessionlistsethostingname.mockClear()
  })

  it('writes sticky session and republishes hosting name', () => {
    handlestickysession(device, {
      player: 'pid_host',
      data: 'Cool Dungeon',
    } as MESSAGE)
    expect(sessionlistsethostingname).toHaveBeenCalledWith('Cool Dungeon')
    expect(storagewritevar).toHaveBeenCalledWith('session', 'Cool Dungeon')
  })

  it('ignores non-string values', () => {
    handlestickysession(device, {
      player: 'pid_host',
      data: 1,
    } as MESSAGE)
    handlestickysession(device, {
      player: 'pid_host',
      data: undefined,
    } as MESSAGE)
    expect(sessionlistsethostingname).not.toHaveBeenCalled()
    expect(storagewritevar).not.toHaveBeenCalled()
  })
})
