const storagewritevar = jest.fn(() => Promise.resolve())

jest.mock('zss/feature/storage', () => ({
  storagewritevar: (...args: unknown[]) => storagewritevar(...args),
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
import { handlestickyuser } from 'zss/device/register/handlers/storage'
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
