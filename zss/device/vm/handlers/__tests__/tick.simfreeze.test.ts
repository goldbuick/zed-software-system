import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { pilottick } from 'zss/device/vm/handlers/pilot'
import { handleticktock } from 'zss/device/vm/handlers/ticktock'
import { memorytickmain } from 'zss/memory/runtime'
import * as session from 'zss/memory/session'

jest.mock('zss/memory/runtime', () => ({
  memorytickmain: jest.fn(),
}))

jest.mock('zss/device/vm/handlers/pilot', () => ({
  pilottick: jest.fn(),
}))

describe('handletick sim freeze', () => {
  const vm = {} as DEVICE
  const msg = {} as MESSAGE

  afterEach(() => {
    session.memorywritesimfreeze(false)
    jest.mocked(memorytickmain).mockClear()
    jest.mocked(pilottick).mockClear()
  })

  it('skips pilottick and memorytickmain when simfreeze is on', () => {
    session.memorywritesimfreeze(true)
    handleticktock(vm, msg)

    expect(pilottick).not.toHaveBeenCalled()
    expect(memorytickmain).not.toHaveBeenCalled()
  })

  it('runs pilottick and memorytickmain when simfreeze is off', () => {
    session.memorywritesimfreeze(false)
    jest.spyOn(session, 'memoryreadhalt').mockReturnValue(false)

    handleticktock(vm, msg)

    expect(pilottick).toHaveBeenCalledWith(vm)
    expect(memorytickmain).toHaveBeenCalledWith(false)
  })
})
