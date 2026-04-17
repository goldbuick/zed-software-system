/*
Worker-side hook test: ensures that when the boardrunner worker is NOT
admitted to the destination board's jsonsync stream (cross-ownership), the
`memorymoveplayertoboard` hook emits `vm:boardrunnertransfer` upstream and
removes the element from the local source board without mutating the
destination. When admitted (single-peer / self-owned), the hook returns
false and the default in-process path runs.
*/
jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
}))

const emitMock = jest.fn()

jest.mock('zss/device', () => {
  const actual = jest.requireActual('zss/device')
  return {
    ...actual,
    createdevice: (name: string) => ({
      name,
      emit: emitMock,
      disconnect: jest.fn(),
      session: () => true,
    }),
  }
})

jest.mock('zss/device/jsonsyncclient', () => ({
  jsonsyncclientreadownplayer: jest.fn(() => 'runner-a'),
  jsonsyncclientreadstream: jest.fn(),
}))

jest.mock('zss/memory/boardlookup', () => ({
  memorydeleteboardobjectnamedlookup: jest.fn(),
}))

jest.mock('zss/memory/memorydirty', () => ({
  memorymarkboarddirty: jest.fn(),
  boardstreamid: (boardid: string) => `board:${boardid}`,
}))

jest.mock('zss/memory/playermanagement', () => ({
  memorysetmoveplayerhook: jest.fn(),
}))

import { jsonsyncclientreadstream } from 'zss/device/jsonsyncclient'
import { memorydeleteboardobjectnamedlookup } from 'zss/memory/boardlookup'
import { memorymarkboarddirty } from 'zss/memory/memorydirty'
import {
  MEMORY_MOVEPLAYER_HOOK,
  memorysetmoveplayerhook,
} from 'zss/memory/playermanagement'
import type { BOARD, BOOK } from 'zss/memory/types'

// Importing the module registers the hook via memorysetmoveplayerhook.
import 'zss/device/boardrunnertransfer'

function capturehook(): MEMORY_MOVEPLAYER_HOOK {
  const calls = (memorysetmoveplayerhook as jest.Mock).mock.calls
  if (calls.length === 0) {
    throw new Error('memorysetmoveplayerhook was never called')
  }
  return calls[calls.length - 1][0] as MEMORY_MOVEPLAYER_HOOK
}

describe('boardrunnertransfer hook', () => {
  beforeEach(() => {
    emitMock.mockClear()
    ;(memorydeleteboardobjectnamedlookup as jest.Mock).mockClear()
    ;(memorymarkboarddirty as jest.Mock).mockClear()
  })

  it('emits vm:boardrunnertransfer and removes source element when destination is not admitted', () => {
    ;(jsonsyncclientreadstream as jest.Mock).mockReturnValue(undefined)
    const hook = capturehook()
    const fromboard = {
      id: 'board-a',
      objects: { 'player-1': { id: 'player-1', kind: 'player' } },
    } as unknown as BOARD
    const element = { id: 'player-1', kind: 'player', x: 0, y: 0 }

    const handled = hook({
      book: {} as BOOK,
      player: 'player-1',
      fromboard,
      toboardid: 'board-b',
      element,
      dest: { x: 5, y: 7 },
    })

    expect(handled).toBe(true)
    expect(emitMock).toHaveBeenCalledTimes(1)
    const [player, target, payload] = emitMock.mock.calls[0]
    expect(player).toBe('runner-a')
    expect(target).toBe('vm:boardrunnertransfer')
    expect(payload.player).toBe('player-1')
    expect(payload.fromboardid).toBe('board-a')
    expect(payload.toboardid).toBe('board-b')
    expect(payload.dest).toEqual({ x: 5, y: 7 })
    expect(payload.element).toEqual(element)
    // element removed from source board
    expect(fromboard.objects['player-1']).toBeUndefined()
    expect(memorymarkboarddirty).toHaveBeenCalledWith(fromboard)
    expect(memorydeleteboardobjectnamedlookup).toHaveBeenCalledWith(
      fromboard,
      element,
    )
  })

  it('returns false and does not emit when destination is locally admitted', () => {
    ;(jsonsyncclientreadstream as jest.Mock).mockReturnValue({})
    const hook = capturehook()
    const fromboard = {
      id: 'board-a',
      objects: { 'player-1': { id: 'player-1' } },
    } as unknown as BOARD

    const handled = hook({
      book: {} as BOOK,
      player: 'player-1',
      fromboard,
      toboardid: 'board-b',
      element: { id: 'player-1' },
      dest: { x: 0, y: 0 },
    })

    expect(handled).toBe(false)
    expect(emitMock).not.toHaveBeenCalled()
    // source must not be touched when hook returns false (default path
    // runs and handles source/destination).
    expect(fromboard.objects['player-1']).toEqual({ id: 'player-1' })
  })
})
