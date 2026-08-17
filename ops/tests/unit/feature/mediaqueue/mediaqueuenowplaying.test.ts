import { handlemediaqueuenowplaying } from 'zss/device/vm/handlers/mediaqueuenowplaying'
import { memoryinvalidatedraw } from 'zss/memory/boarddrawdirty'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryinvalidategadgetlayerscacheforboard } from 'zss/memory/rendering'
import { memoryensureboardruntime } from 'zss/memory/runtimeboundary'

jest.mock('zss/memory/boards', () => ({
  memoryreadboardbyaddress: jest.fn(),
}))

jest.mock('zss/memory/runtimeboundary', () => ({
  memoryensureboardruntime: jest.fn(),
}))

jest.mock('zss/memory/boarddrawdirty', () => ({
  memoryinvalidatedraw: jest.fn(),
}))

jest.mock('zss/memory/rendering', () => ({
  memoryinvalidategadgetlayerscacheforboard: jest.fn(),
}))

describe('mediaqueue now playing board runtime sync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets now playing title on board runtime', () => {
    const board = { id: 'board-a' }
    const runtime: { mediaqueuenowplayingtitle?: string } = {}
    jest.mocked(memoryreadboardbyaddress).mockReturnValue(board as never)
    jest.mocked(memoryensureboardruntime).mockReturnValue(runtime as never)
    handlemediaqueuenowplaying({} as never, {
      player: 'p1',
      data: {
        action: 'set',
        boardid: 'board-a',
        title: 'Cool Video Title',
      },
    } as never)
    expect(runtime.mediaqueuenowplayingtitle).toBe('Cool Video Title')
    expect(memoryinvalidatedraw).toHaveBeenCalledWith(board)
    expect(memoryinvalidategadgetlayerscacheforboard).toHaveBeenCalledWith(
      'board-a',
    )
  })

  it('clears now playing title on stop', () => {
    const board = { id: 'board-a' }
    const runtime = { mediaqueuenowplayingtitle: 'Cool Video Title' }
    jest.mocked(memoryreadboardbyaddress).mockReturnValue(board as never)
    jest.mocked(memoryensureboardruntime).mockReturnValue(runtime as never)
    handlemediaqueuenowplaying({} as never, {
      player: 'p1',
      data: {
        action: 'clear',
        boardid: 'board-a',
        title: '',
      },
    } as never)
    expect(runtime.mediaqueuenowplayingtitle).toBeUndefined()
    expect(memoryinvalidatedraw).toHaveBeenCalledWith(board)
    expect(memoryinvalidategadgetlayerscacheforboard).toHaveBeenCalledWith(
      'board-a',
    )
  })
})
