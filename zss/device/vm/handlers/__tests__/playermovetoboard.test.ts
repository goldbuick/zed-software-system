import type { DEVICE } from 'zss/device'
import type { MESSAGE, VM_PLAYERMOVETOBOARD } from 'zss/device/api'
import { handleplayermovetoboard } from 'zss/device/vm/handlers/playermovetoboard'
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

jest.mock('zss/memory/session', () => ({
  memoryreadbookbysoftware: jest.fn(),
}))

jest.mock('zss/memory/playermanagement', () => ({
  memorymoveplayertoboard: jest.fn(() => true),
  memoryreadplayerboard: jest.fn(),
}))

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
    jest.clearAllMocks()
    ;(memorymoveplayertoboard as jest.Mock).mockReturnValue(true)
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

  it('calls memorymoveplayertoboard on success', () => {
    const book = { id: 'main' }
    ;(memoryreadbookbysoftware as jest.Mock).mockReturnValue(book)
    ;(memoryreadplayerboard as jest.Mock).mockReturnValue({ id: 'board-a' })

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
  })
})
