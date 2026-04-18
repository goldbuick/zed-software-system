import type { DEVICE } from 'zss/device'
import type { MESSAGE, VM_PLAYERMOVETOBOARD } from 'zss/device/api'
import { handleplayermovetoboard } from 'zss/device/vm/handlers/playermovetoboard'
import { boardrunnerowned } from 'zss/device/api'
import {
  memorysyncrevokeboardrunner,
  memorysyncupdateboard,
  memorysyncupdatememory,
} from 'zss/device/vm/memorysync'
import {
  ackboardrunners,
  boardrunners,
  failedboardrunners,
} from 'zss/device/vm/state'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import {
  memorymoveplayertoboard,
  memoryreadplayerboard,
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

jest.mock('zss/device/api', () => ({
  boardrunnerowned: jest.fn(),
}))

jest.mock('zss/device/vm/memorysync', () => ({
  memorysyncupdateboard: jest.fn(),
  memorysyncupdatememory: jest.fn(),
  memorysyncrevokeboardrunner: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbookbysoftware: jest.fn(),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memorymoveplayertoboard: jest.fn(() => true),
  memoryreadplayerboard: jest.fn(),
}))

jest.mock('zss/memory/codepages', () => ({
  memorypickcodepagewithtypeandstat: jest.fn(),
}))

function clearrunners() {
  for (const k of Object.keys(ackboardrunners)) {
    delete ackboardrunners[k]
  }
  for (const k of Object.keys(boardrunners)) {
    delete boardrunners[k]
  }
  for (const k of Object.keys(failedboardrunners)) {
    delete failedboardrunners[k]
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
    clearrunners()
    jest.clearAllMocks()
    ;(memorymoveplayertoboard as jest.Mock).mockReturnValue(true)
  })

  afterEach(() => {
    clearrunners()
  })

  it('drops silently on invalid payload', () => {
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue({})
    const message = {
      player: 'player-1',
      data: { board: '', dest: { x: 0, y: 0 } },
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(memorymoveplayertoboard).not.toHaveBeenCalled()
    expect(memorysyncupdatememory).not.toHaveBeenCalled()
  })

  it('drops when main book is missing', () => {
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(undefined)
    const message = {
      player: 'player-1',
      data: makepayload(),
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(memorymoveplayertoboard).not.toHaveBeenCalled()
  })

  it('calls memorymoveplayertoboard and pokes streams on success', () => {
    const book = {}
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(book)
    ;(memoryreadplayerboard as jest.Mock).mockReturnValue({ id: 'board-a' })
    const destpage = { id: 'board-b' }
    const sourcepage = { id: 'board-a' }
    ;(memorypickcodepagewithtypeandstat as jest.Mock).mockImplementation(
      (_type: unknown, id: string) => {
        if (id === 'board-b') {
          return destpage
        }
        if (id === 'board-a') {
          return sourcepage
        }
        return undefined
      },
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
    expect(memorysyncupdatememory).toHaveBeenCalled()
    expect(memorysyncupdateboard).toHaveBeenCalledWith(destpage)
    expect(memorysyncupdateboard).toHaveBeenCalledWith(sourcepage)
  })

  it('does not poke streams when memorymoveplayertoboard returns false', () => {
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue({})
    ;(memoryreadplayerboard as jest.Mock).mockReturnValue({ id: 'board-a' })
    ;(memorymoveplayertoboard as jest.Mock).mockReturnValue(false)

    const message = {
      player: 'player-1',
      data: makepayload(),
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(memorysyncupdatememory).not.toHaveBeenCalled()
    expect(memorysyncupdateboard).not.toHaveBeenCalled()
  })

  it('clears runner election when moving player was elected runner of source board', () => {
    const book = {}
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(book)
    ;(memoryreadplayerboard as jest.Mock).mockReturnValue({ id: 'board-a' })
    boardrunners['board-a'] = 'player-1'
    ackboardrunners['board-a'] = 'player-1'
    failedboardrunners['board-a'] = { 'player-1': 1 }

    const destpage = { id: 'board-b' }
    const sourcepage = { id: 'board-a' }
    ;(memorypickcodepagewithtypeandstat as jest.Mock).mockImplementation(
      (_type: unknown, id: string) => {
        if (id === 'board-b') {
          return destpage
        }
        if (id === 'board-a') {
          return sourcepage
        }
        return undefined
      },
    )

    const message = {
      player: 'player-1',
      data: makepayload(),
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(boardrunners['board-a']).toBeUndefined()
    expect(ackboardrunners['board-a']).toBeUndefined()
    expect(failedboardrunners['board-a']).toBeUndefined()
    expect(memorysyncrevokeboardrunner).toHaveBeenCalledWith(
      'player-1',
      'board-a',
    )
    expect(boardrunnerowned).toHaveBeenCalledWith(vm, 'player-1', [])
  })

  it('clears runner election when moving player was only acked runner', () => {
    const book = {}
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(book)
    ;(memoryreadplayerboard as jest.Mock).mockReturnValue({ id: 'board-a' })
    boardrunners['board-a'] = 'other'
    ackboardrunners['board-a'] = 'player-1'

    const destpage = { id: 'board-b' }
    const sourcepage = { id: 'board-a' }
    ;(memorypickcodepagewithtypeandstat as jest.Mock).mockImplementation(
      (_type: unknown, id: string) => {
        if (id === 'board-b') {
          return destpage
        }
        if (id === 'board-a') {
          return sourcepage
        }
        return undefined
      },
    )

    const message = {
      player: 'player-1',
      data: makepayload(),
    } as unknown as MESSAGE

    handleplayermovetoboard(vm, message)

    expect(boardrunners['board-a']).toBeUndefined()
    expect(ackboardrunners['board-a']).toBeUndefined()
    expect(memorysyncrevokeboardrunner).toHaveBeenCalledWith(
      'player-1',
      'board-a',
    )
    expect(boardrunnerowned).toHaveBeenCalledWith(vm, 'player-1', [])
  })
})
