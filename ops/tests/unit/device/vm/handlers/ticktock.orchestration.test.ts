jest.mock('zss/memory/runtime', () => ({
  memorytickloaders: jest.fn(),
}))

jest.mock('zss/device/api', () => ({
  boardrunnertick: jest.fn(),
}))

jest.mock('zss/device/vm/boardrunnerpushupdates', () => ({
  boardrunnerpushupdates: jest.fn(),
}))

jest.mock('zss/device/vm/gadgetsynctick', () => ({
  gadgetsynctick: jest.fn(),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memoryreadbookplayerboards: jest.fn(() => []),
}))

jest.mock('zss/memory/boardwait', () => ({
  memorycollecttickboundaries: jest.fn(() => []),
}))

jest.mock('zss/device/vm/boardrunnermanagement', () => ({
  boardrunneraccessfor: jest.fn(() => []),
  boardrunnerassignmentvalid: jest.fn(() => true),
  boardrunnerblock: jest.fn(),
  boardrunnerbudgetdec: jest.fn(() => false),
  boardrunnerelect: jest.fn(),
  boardrunnerevict: jest.fn(),
}))

import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnertick } from 'zss/device/api'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import { gadgetsynctick } from 'zss/device/vm/gadgetsynctick'
import { handleticktock } from 'zss/device/vm/handlers/ticktock'
import { boardrunners } from 'zss/device/vm/state'
import { memorytickloaders } from 'zss/memory/runtime'
import * as session from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'

const stubmainbook: BOOK = {
  id: 'stub-main',
  name: 'main',
  timestamp: 0,
  activelist: [],
  pages: [],
  flags: {},
}

describe('handleticktock orchestration', () => {
  const vm = {} as DEVICE
  const msg = {} as MESSAGE

  afterEach(() => {
    session.memorywritefrozen(false)
    Object.keys(boardrunners).forEach((key) => delete boardrunners[key])
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  it('runs full tick pipeline when sim is unfrozen', () => {
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockReturnValue(stubmainbook)
    boardrunners['board-1'] = 'runner-a'
    handleticktock(vm, msg)

    expect(memorytickloaders).toHaveBeenCalled()
    expect(boardrunnerpushupdates).toHaveBeenCalledWith(vm)
    expect(boardrunnertick).toHaveBeenCalled()
    expect(gadgetsynctick).toHaveBeenCalledWith(vm)
  })
})
