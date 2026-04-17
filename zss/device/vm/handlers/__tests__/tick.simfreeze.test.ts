import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { handletick } from 'zss/device/vm/handlers/tick'
import { memorytickmain } from 'zss/memory/runtime'
import * as session from 'zss/memory/session'

jest.mock('zss/memory/runtime', () => ({
  memorytickmain: jest.fn(),
}))

describe('handletick sim freeze', () => {
  const vm = {} as DEVICE
  const msg = {} as MESSAGE

  afterEach(() => {
    session.memorywritesimfreeze(false)
    jest.mocked(memorytickmain).mockClear()
  })

  it('skips memorytickmain when simfreeze is on', () => {
    session.memorywritesimfreeze(true)
    handletick(vm, msg)

    expect(memorytickmain).not.toHaveBeenCalled()
  })

  it('runs memorytickmain (loader-only) when simfreeze is off', () => {
    session.memorywritesimfreeze(false)
    jest.spyOn(session, 'memoryreadhalt').mockReturnValue(false)

    handletick(vm, msg)

    // Phase 2: server tick runs loader-only (second arg `loadersonly = true`).
    // Boards are now ticked by the elected boardrunner worker. Pilot also
    // moved there (user:pilot* targets go to boardrunneruser.ts).
    expect(memorytickmain).toHaveBeenCalledWith(false, true)
  })
})
