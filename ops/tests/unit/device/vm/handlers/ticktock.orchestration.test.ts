jest.mock('zss/memory/runtime', () => ({
  memorytickloaders: jest.fn(),
  memorytickmain: jest.fn(),
}))

jest.mock('zss/device/vm/gadgetsynctick', () => ({
  gadgetsynctick: jest.fn(),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memoryreadbookplayerboards: jest.fn(() => []),
}))

jest.mock('zss/memory/boardaccess', () => ({
  memoryreadplayersonboard: jest.fn(() => []),
}))

jest.mock('zss/memory/gadgetlayersflags', () => ({
  memoryreadbookgadgetlayersforboard: jest.fn(() => ({})),
}))

jest.mock('zss/memory/rendering', () => ({
  memoryreadgadgetlayers: jest.fn(() => ({ id: 'layers' })),
  memoryreadgraphics: jest.fn(() => ({ graphics: 'flat' })),
}))

import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { gadgetsynctick } from 'zss/device/vm/gadgetsynctick'
import { handleticktock } from 'zss/device/vm/handlers/ticktock'
import { memoryreadplayersonboard } from 'zss/memory/boardaccess'
import { memoryreadbookgadgetlayersforboard } from 'zss/memory/gadgetlayersflags'
import { memoryreadbookplayerboards } from 'zss/memory/playermanagement'
import { memoryreadgadgetlayers } from 'zss/memory/rendering'
import { memorytickloaders, memorytickmain } from 'zss/memory/runtime'
import * as session from 'zss/memory/session'
import type { BOARD, BOOK } from 'zss/memory/types'

const stubmainbook: BOOK = {
  id: 'stub-main',
  name: 'main',
  timestamp: 0,
  activelist: [],
  pages: [],
  flags: {},
}

const boardsource = { id: 'board-source' } as BOARD
const boarddest = { id: 'board-dest' } as BOARD

describe('handleticktock orchestration', () => {
  const vm = {} as DEVICE
  const msg = {} as MESSAGE

  afterEach(() => {
    session.memorywritefrozen(false)
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  it('runs full tick pipeline when sim is unfrozen', () => {
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockReturnValue(stubmainbook)
    handleticktock(vm, msg)

    expect(memorytickloaders).toHaveBeenCalled()
    expect(memorytickmain).toHaveBeenCalled()
    expect(gadgetsynctick).toHaveBeenCalledWith(vm)
  })

  it('rebuilds gadget layers from post-tick player boards after mid-tick move', () => {
    jest
      .spyOn(session, 'memoryreadbookbysoftware')
      .mockReturnValue(stubmainbook)
    ;(memoryreadbookplayerboards as jest.Mock)
      .mockReturnValueOnce([boardsource])
      .mockReturnValueOnce([boarddest])
    ;(memoryreadplayersonboard as jest.Mock).mockImplementation((board) =>
      board.id === 'board-dest' ? ['pid_player'] : [],
    )
    const layerstore: Record<string, unknown> = {}
    ;(memoryreadbookgadgetlayersforboard as jest.Mock).mockReturnValue(
      layerstore,
    )

    handleticktock(vm, msg)

    expect(memorytickmain).toHaveBeenCalledWith(
      stubmainbook.timestamp,
      [boardsource],
      false,
    )
    expect(memoryreadbookplayerboards).toHaveBeenCalledTimes(2)
    expect(memoryreadbookgadgetlayersforboard).toHaveBeenCalledWith(
      stubmainbook,
      'board-dest',
    )
    expect(memoryreadgadgetlayers).toHaveBeenCalledWith('flat', boarddest)
    expect(layerstore.flat).toEqual({ id: 'layers' })
  })
})
