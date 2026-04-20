import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { handletick } from 'zss/device/vm/handlers/tick'
import { memorytickloaders } from 'zss/memory/runtime'
import * as session from 'zss/memory/session'

jest.mock('zss/memory/runtime', () => ({
  memorytickloaders: jest.fn(),
}))

describe('handletick freeze', () => {
  const vm = {} as DEVICE
  const msg = {} as MESSAGE

  afterEach(() => {
    session.memorywritefreeze(false)
    jest.mocked(memorytickloaders).mockClear()
  })

  it('skips memorytickloaders when freeze is on', () => {
    session.memorywritefreeze(true)
    handletick(vm, msg)

    expect(memorytickloaders).not.toHaveBeenCalled()
  })

  it('runs memorytickloaders when freeze is off', () => {
    session.memorywritefreeze(false)

    handletick(vm, msg)

    // Sim tick runs loaders + frame clock only; boards tick on boardrunner
    // workers via `memorytickmain`.
    expect(memorytickloaders).toHaveBeenCalled()
  })
})
