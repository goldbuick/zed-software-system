import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { pilottick } from 'zss/device/vm/handlers/pilot'
import { handletick } from 'zss/device/vm/handlers/tick'
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
    handletick(vm, msg)

    expect(pilottick).not.toHaveBeenCalled()
    expect(memorytickmain).not.toHaveBeenCalled()
  })

  it('runs pilottick and memorytickmain when simfreeze is off', () => {
    session.memorywritesimfreeze(false)
    jest.spyOn(session, 'memoryreadhalt').mockReturnValue(false)

    handletick(vm, msg)

    expect(pilottick).toHaveBeenCalledWith(vm)
    // Phase 2: server tick runs loader-only (second arg `loadersonly = true`).
    // Boards are now ticked by the elected boardrunner worker.
    expect(memorytickmain).toHaveBeenCalledWith(false, true)
  })
})
