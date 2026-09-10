import { handlemediaqueueboard } from 'zss/device/vm/handlers/mediaqueueboard'
import { memoryinvalidatedraw } from 'zss/memory/boarddrawdirty'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryinvalidategadgetlayerscacheforboard } from 'zss/memory/rendering'

jest.mock('zss/memory/boards', () => ({
  memoryreadboardbyaddress: jest.fn(),
}))

jest.mock('zss/memory/boarddrawdirty', () => ({
  memoryinvalidatedraw: jest.fn(),
}))

jest.mock('zss/memory/rendering', () => ({
  memoryinvalidategadgetlayerscacheforboard: jest.fn(),
}))

describe('mediaqueue board runtime sync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('binds helper peer id on board', () => {
    const board: {
      id: string
      mediaqueuehelperpeerid?: string
    } = { id: 'board-a' }
    jest.mocked(memoryreadboardbyaddress).mockReturnValue(board as never)
    handlemediaqueueboard({} as never, {
      player: 'p1',
      data: {
        action: 'bind',
        boardid: 'board-a',
        helperpeerid: 'helper-1',
      },
    } as never)
    expect(board.mediaqueuehelperpeerid).toBe('helper-1')
    expect(memoryinvalidatedraw).toHaveBeenCalledWith(board)
    expect(memoryinvalidategadgetlayerscacheforboard).toHaveBeenCalledWith(
      'board-a',
    )
  })

  it('clears helper peer id on stop', () => {
    const board: {
      id: string
      mediaqueuehelperpeerid?: string
      mediaqueuenowplayingtitle?: string
    } = {
      id: 'board-a',
      mediaqueuehelperpeerid: 'helper-1',
      mediaqueuenowplayingtitle: 'Playing',
    }
    jest.mocked(memoryreadboardbyaddress).mockReturnValue(board as never)
    handlemediaqueueboard({} as never, {
      player: 'p1',
      data: {
        action: 'clear',
        boardid: 'board-a',
        helperpeerid: '',
      },
    } as never)
    expect(board.mediaqueuehelperpeerid).toBeUndefined()
    expect(board.mediaqueuenowplayingtitle).toBeUndefined()
    expect(memoryinvalidatedraw).toHaveBeenCalledWith(board)
    expect(memoryinvalidategadgetlayerscacheforboard).toHaveBeenCalledWith(
      'board-a',
    )
  })
})
