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

jest.mock('zss/device/vm/boardrunnermemorysync', () => ({
  boardrunnermemorysync: jest.fn(),
}))
jest.mock('zss/device/vm/boardrunnerboundarysync', () => ({
  boardrunnerboundarymemorysync: jest.fn(),
}))
jest.mock('zss/device/vm/gadgetsynctick', () => ({
  gadgetsynctick: jest.fn(),
}))

const stubmainbook: BOOK = {
  id: 'stub-main',
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

  it('skips tick body when simfreeze is on', () => {
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockReturnValue(stubmainbook)
    session.memorywritesimfreeze(true)
    handleticktock(vm, msg)

    expect(pilottick).not.toHaveBeenCalled()
    expect(memorytickloaders).not.toHaveBeenCalled()
  })

  it('runs pilottick and loader tick when simfreeze is off', () => {
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockReturnValue(stubmainbook)
    session.memorywritesimfreeze(false)

    handleticktock(vm, msg)

    expect(pilottick).toHaveBeenCalledWith(vm)
    expect(memorytickloaders).toHaveBeenCalled()
  })
})
