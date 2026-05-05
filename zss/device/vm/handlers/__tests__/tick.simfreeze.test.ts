import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { pilottick } from 'zss/device/vm/handlers/pilot'
import { handleticktock } from 'zss/device/vm/handlers/ticktock'
import { memorytickmain } from 'zss/memory/runtime'
import * as session from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'

jest.mock('zss/memory/runtime', () => ({
  memorytickmain: jest.fn(),
}))

jest.mock('zss/device/vm/handlers/pilot', () => ({
  pilottick: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnersync', () => ({
  boardrunnermemorysync: jest.fn(),
}))

const stubmainbook: BOOK = {
  id: 'stub-main',
  name: 'main',
  timestamp: 0,
  activelist: [],
  pages: [],
  flags: 'stub-flags',
}

describe('handletick sim freeze', () => {
  const vm = {} as DEVICE
  const msg = {} as MESSAGE

  afterEach(() => {
    session.memorywritesimfreeze(false)
    jest.mocked(memorytickmain).mockClear()
    jest.mocked(pilottick).mockClear()
    jest.restoreAllMocks()
  })

  it('skips pilottick and memorytickmain when simfreeze is on', () => {
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockReturnValue(stubmainbook)
    session.memorywritesimfreeze(true)
    handleticktock(vm, msg)

    expect(pilottick).not.toHaveBeenCalled()
    expect(memorytickmain).not.toHaveBeenCalled()
  })

  it('runs pilottick and memorytickmain when simfreeze is off', () => {
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockReturnValue(stubmainbook)
    session.memorywritesimfreeze(false)
    jest.spyOn(session, 'memoryreadhalt').mockReturnValue(false)

    handleticktock(vm, msg)

    expect(pilottick).toHaveBeenCalledWith(vm)
    expect(memorytickmain).toHaveBeenCalledWith(false)
  })
})
