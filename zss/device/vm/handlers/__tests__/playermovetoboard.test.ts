import type { DEVICE } from 'zss/device'
import type { MESSAGE, VM_PLAYERMOVETOBOARD } from 'zss/device/api'
import * as api from 'zss/device/api'
import { handleplayermovetoboard } from 'zss/device/vm/handlers/playermovetoboard'
import * as memorysync from 'zss/device/vm/memorysimsync'
import {
  ackboardrunners,
  boardrunners,
  skipboardrunners,
  tracking,
} from 'zss/device/vm/state'
import {
  memorymoveplayertoboard,
  memoryreadplayerboard,
  memoryreadplayersfromboard,
} from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbookbysoftware: jest.fn(),
  memoryreadoperator: jest.fn(() => 'player-1'),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memorymoveplayertoboard: jest.fn(() => true),
  memoryreadplayerboard: jest.fn(),
  memoryreadplayersfromboard: jest.fn(),
}))

function clearvmrunner() {
  for (const k of Object.keys(boardrunners)) {
    delete boardrunners[k]
  }
  for (const k of Object.keys(ackboardrunners)) {
    delete ackboardrunners[k]
  }
  for (const k of Object.keys(skipboardrunners)) {
    delete skipboardrunners[k]
  }
  for (const k of Object.keys(tracking)) {
    delete tracking[k]
  }
}

function makepayload(
  overrides: Partial<VM_PLAYERMOVETOBOARD> = {},
): VM_PLAYERMOVETOBOARD {
  return {
    board: 'board-b',
    dest: { x: 10, y: 20 },
    ...overrides,
  }
}

describe('handleplayermovetoboard', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    clearvmrunner()
    jest.clearAllMocks()
    ;(memorymoveplayertoboard as jest.Mock).mockReturnValue(true)
    ;(memoryreadplayersfromboard as jest.Mock).mockReturnValue([])
    jest
      .spyOn(memorysync, 'memorysyncadmitboardrunner')
      .mockImplementation(() => {})
    jest
      .spyOn(memorysync, 'memorysyncrevokeboardrunner')
      .mockImplementation(() => {})
    jest.spyOn(memorysync, 'memorysyncpushdirty').mockImplementation(() => {})
    jest.spyOn(api, 'boardrunnerowned').mockImplementation(() => {})
  })

  afterEach(() => {
    clearvmrunner()
    jest.restoreAllMocks()
  })

  it('returns early on invalid payload without moving', () => {
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue({})
    const message = {
      player: 'player-1',
      data: { board: '', dest: { x: 0, y: 0 } },
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(memorymoveplayertoboard).not.toHaveBeenCalled()
  })

  it('returns early when main book is missing', () => {
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(undefined)
    const message = {
      player: 'player-1',
      data: makepayload(),
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(memorymoveplayertoboard).not.toHaveBeenCalled()
  })

  it('calls memorymoveplayertoboard on success and installs mover when dest has no valid runner', () => {
    const book = { id: 'main' }
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(book)
    ;(memoryreadplayerboard as jest.Mock).mockReturnValue({ id: 'board-a' })
    ;(memoryreadplayersfromboard as jest.Mock).mockImplementation(
      (board: string) => (board === 'board-b' ? ['player-1'] : []),
    )

    const message = {
      player: 'player-1',
      data: makepayload(),
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(memorymoveplayertoboard).toHaveBeenCalledWith(
      book,
      'player-1',
      'board-b',
      { x: 10, y: 20 },
    )
    expect(memorysync.memorysyncadmitboardrunner).toHaveBeenCalledWith(
      'player-1',
      'board-b',
    )
    expect(memorysync.memorysyncpushdirty).toHaveBeenCalled()
  })

  it('does nothing after move when memorymoveplayertoboard returns false', () => {
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue({})
    ;(memoryreadplayerboard as jest.Mock).mockReturnValue({ id: 'board-a' })
    ;(memorymoveplayertoboard as jest.Mock).mockReturnValue(false)

    const message = {
      player: 'player-1',
      data: makepayload(),
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(memorymoveplayertoboard).toHaveBeenCalled()
    expect(memorysync.memorysyncadmitboardrunner).not.toHaveBeenCalled()
  })

  it('when mover was source runner, revokes source and elects replacement then admits mover on dest', () => {
    const book = { id: 'main' }
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(book)
    ;(memoryreadplayerboard as jest.Mock).mockReturnValue({ id: 'board-a' })
    boardrunners['board-a'] = 'player-1'
    ackboardrunners['board-a'] = 1
    tracking.p2 = 10
    tracking['player-1'] = 5
    ;(memoryreadplayersfromboard as jest.Mock).mockImplementation(
      (board: string) => {
        if (board === 'board-a') {
          return ['p2']
        }
        if (board === 'board-b') {
          return ['player-1']
        }
        return []
      },
    )

    const message = {
      player: 'player-1',
      data: makepayload(),
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(memorysync.memorysyncrevokeboardrunner).toHaveBeenCalledWith(
      'player-1',
      'board-a',
    )
    expect(memorysync.memorysyncadmitboardrunner).toHaveBeenCalledWith(
      'p2',
      'board-a',
    )
    expect(memorysync.memorysyncadmitboardrunner).toHaveBeenCalledWith(
      'player-1',
      'board-b',
    )
    expect(boardrunners['board-a']).toBe('p2')
    expect(boardrunners['board-b']).toBe('player-1')
    expect(memorysync.memorysyncpushdirty).toHaveBeenCalled()
  })

  it('does not admit on dest when another valid runner is already registered', () => {
    const book = { id: 'main' }
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(book)
    ;(memoryreadplayerboard as jest.Mock).mockReturnValue({ id: 'board-a' })
    boardrunners['board-b'] = 'other'
    ackboardrunners['board-b'] = 1
    ;(memoryreadplayersfromboard as jest.Mock).mockImplementation(
      (board: string) => {
        if (board === 'board-b') {
          return ['other', 'player-1']
        }
        return []
      },
    )

    const message = {
      player: 'player-1',
      data: makepayload(),
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(memorysync.memorysyncadmitboardrunner).not.toHaveBeenCalled()
    expect(memorysync.memorysyncpushdirty).not.toHaveBeenCalled()
  })

  it('replaces stale dest runner not on board with mover', () => {
    const book = { id: 'main' }
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(book)
    ;(memoryreadplayerboard as jest.Mock).mockReturnValue({ id: 'board-a' })
    boardrunners['board-b'] = 'ghost'
    ;(memoryreadplayersfromboard as jest.Mock).mockImplementation(
      (board: string) => {
        if (board === 'board-b') {
          return ['player-1']
        }
        return []
      },
    )

    const message = {
      player: 'player-1',
      data: makepayload(),
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(memorysync.memorysyncadmitboardrunner).toHaveBeenCalledWith(
      'player-1',
      'board-b',
    )
    expect(boardrunners['board-b']).toBe('player-1')
  })

  it('clears skip for mover when installing on dest', () => {
    const book = { id: 'main' }
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(book)
    ;(memoryreadplayerboard as jest.Mock).mockReturnValue({ id: 'board-a' })
    ;(memoryreadplayersfromboard as jest.Mock).mockImplementation(
      (board: string) => (board === 'board-b' ? ['player-1'] : []),
    )
    skipboardrunners['player-1'] = true

    const message = {
      player: 'player-1',
      data: makepayload(),
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(skipboardrunners['player-1']).toBeUndefined()
  })
})
