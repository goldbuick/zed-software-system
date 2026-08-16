import { handlemediaqueueboard } from 'zss/device/vm/handlers/mediaqueueboard'
import { memoryinvalidatedraw } from 'zss/memory/boarddrawdirty'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
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

describe('mediaqueue board runtime sync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('binds helper peer id on board runtime', () => {
    const board = { id: 'board-a' }
    const runtime: { mediaqueuehelperpeerid?: string } = {}
    jest.mocked(memoryreadboardbyaddress).mockReturnValue(board as never)
    jest.mocked(memoryensureboardruntime).mockReturnValue(runtime as never)
    handlemediaqueueboard({} as never, {
      player: 'p1',
      data: {
        action: 'bind',
        boardid: 'board-a',
        helperpeerid: 'helper-1',
      },
    } as never)
    expect(runtime.mediaqueuehelperpeerid).toBe('helper-1')
    expect(memoryinvalidatedraw).toHaveBeenCalledWith(board)
  })

  it('clears helper peer id on stop', () => {
    const board = { id: 'board-a' }
    const runtime = { mediaqueuehelperpeerid: 'helper-1' }
    jest.mocked(memoryreadboardbyaddress).mockReturnValue(board as never)
    jest.mocked(memoryensureboardruntime).mockReturnValue(runtime as never)
    handlemediaqueueboard({} as never, {
      player: 'p1',
      data: {
        action: 'clear',
        boardid: 'board-a',
        helperpeerid: '',
      },
    } as never)
    expect(runtime.mediaqueuehelperpeerid).toBeUndefined()
    expect(memoryinvalidatedraw).toHaveBeenCalledWith(board)
  })
})
