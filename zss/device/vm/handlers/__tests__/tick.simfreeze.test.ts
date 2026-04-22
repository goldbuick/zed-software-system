import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import { handletick } from 'zss/device/vm/handlers/tick'
import { memorytickloaders } from 'zss/memory/runtime'
import * as session from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import type { BOOK } from 'zss/memory/types'

jest.mock('zss/memory/runtime', () => ({
  memorytickloaders: jest.fn(),
}))

describe('handletick freeze', () => {
  const vm = {} as DEVICE
  const msg = {} as MESSAGE
  const mainbook = {
    id: 'main',
    name: 'main',
    timestamp: 0,
    activelist: [],
    pages: [],
    flags: {},
  } as BOOK

  afterEach(() => {
    session.memorywritefreeze(false)
    jest.mocked(memorytickloaders).mockClear()
    jest.restoreAllMocks()
  })

  it('skips memorytickloaders when freeze is on', () => {
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockReturnValue(mainbook)
    session.memorywritefreeze(true)
    jest.spyOn(api, 'boardrunnertick').mockImplementation(() => {})

    handletick(vm, msg)

    expect(memorytickloaders).not.toHaveBeenCalled()
  })

  it('runs memorytickloaders when freeze is off and main book exists', () => {
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockImplementation((label) =>
        label === MEMORY_LABEL.MAIN ? mainbook : undefined,
      )
    session.memorywritefreeze(false)
    jest.spyOn(api, 'boardrunnertick').mockImplementation(() => {})

    handletick(vm, msg)

    expect(memorytickloaders).toHaveBeenCalled()
  })
})
