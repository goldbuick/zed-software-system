jest.mock('zss/device/api', () => ({
  vmboardrunnerack: jest.fn(),
  vmboardrunneraccess: jest.fn(),
  vmboardrunnerpaint: jest.fn(),
  workstatus: jest.fn(),
}))

jest.mock('zss/device/boardrunner/sync', () => ({
  pushworkerupdates: jest.fn(),
  waitformemory: jest.fn(() => false),
}))

jest.mock('zss/device/boardrunner/state', () => ({
  assignedboundaries: new Set<string>(),
  incmemorysyncaccess: jest.fn(),
  memorysyncaccess: 0,
  playersonassignedboard: new Set<string>(),
  readworkerboundarypipe: jest.fn(() => ({
    isdesynced: () => false,
    forcedesync: jest.fn(),
  })),
  resetfirsttick: jest.fn(),
}))

jest.mock('zss/memory/runtime', () => ({
  memorytickmain: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadassignedboard: jest.fn(() => 'board-a'),
  memoryreadboardrunner: jest.fn(() => 'runner-a'),
  memoryreadbookbysoftware: jest.fn(() => ({
    id: 'main',
    timestamp: 0,
  })),
  memoryreadhalt: jest.fn(() => false),
  memorywriteassignedboard: jest.fn(),
}))

jest.mock('zss/memory/boundaries', () => ({
  memoryboundaryget: jest.fn(() => ({
    board: { id: 'board-a', terrain: [], objects: {} },
  })),
}))

jest.mock('zss/memory/boardaccess', () => ({
  memoryreadplayersonboard: jest.fn(() => []),
}))

jest.mock('zss/memory/boards', () => ({
  memoryreadoverboard: jest.fn(() => undefined),
  memoryreadunderboard: jest.fn(() => undefined),
}))

jest.mock('zss/memory/boundaryrouting', () => ({
  memorycollectboundaryidsforboard: jest.fn(() => []),
}))

jest.mock('zss/memory/gadgetlayersflags', () => ({
  memoryreadbookgadgetlayersforboard: jest.fn(() => ({})),
}))

jest.mock('zss/memory/rendering', () => ({
  memoryreadgadgetlayers: jest.fn(),
  memoryreadgraphics: jest.fn(() => ({ graphics: 'iso' })),
}))

import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmboardrunnerack } from 'zss/device/api'
import { handletick } from 'zss/device/boardrunner/handlers/tick'
import { pushworkerupdates } from 'zss/device/boardrunner/sync'
import { memorytickmain } from 'zss/memory/runtime'

describe('handletick', () => {
  const device = {
    reply: jest.fn(),
  } as unknown as DEVICE

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ignores non-array payload', () => {
    handletick(device, { data: 'bad' } as MESSAGE)
    expect(vmboardrunnerack).not.toHaveBeenCalled()
  })

  it('acks tick and runs memorytickmain when memory is ready', () => {
    handletick(device, {
      data: ['board-a', 42, []],
    } as MESSAGE)

    expect(vmboardrunnerack).toHaveBeenCalledWith(device, 'runner-a')
    expect(memorytickmain).toHaveBeenCalled()
    expect(pushworkerupdates).toHaveBeenCalledWith(device)
  })
})
