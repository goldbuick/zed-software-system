import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { pilottick } from 'zss/device/vm/handlers/pilot'
import { handleticktock } from 'zss/device/vm/handlers/ticktock'
import { memorytickloaders } from 'zss/memory/runtime'
import * as session from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'

jest.mock('zss/memory/runtime', () => ({
  memorytickloaders: jest.fn(),
}))

jest.mock('zss/device/vm/handlers/pilot', () => ({
  pilottick: jest.fn(),
}))

const FAKE_MAIN_BOOK: BOOK = {
  id: 'mainbook',
  name: 'main',
  timestamp: 0,
  activelist: [],
  pages: [],
  flags: {},
}

describe('handletick sim freeze', () => {
  const vm = {} as DEVICE
  const msg = {} as MESSAGE

  afterEach(() => {
    session.memorywritesimfreeze(false)
    jest.mocked(memorytickloaders).mockClear()
    jest.mocked(pilottick).mockClear()
    jest.restoreAllMocks()
  })

  it('skips pilottick and memorytickloaders when simfreeze is on', () => {
    session.memorywritesimfreeze(true)
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockReturnValue(FAKE_MAIN_BOOK)

    handleticktock(vm, msg)

    expect(pilottick).not.toHaveBeenCalled()
    expect(memorytickloaders).not.toHaveBeenCalled()
  })

  it('runs pilottick and memorytickloaders when simfreeze is off', () => {
    session.memorywritesimfreeze(false)
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockReturnValue(FAKE_MAIN_BOOK)

    handleticktock(vm, msg)

    expect(pilottick).toHaveBeenCalledWith(vm)
    expect(memorytickloaders).toHaveBeenCalled()
  })
})
