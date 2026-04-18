import { LAYER_TYPE, VIEWSCALE } from 'zss/gadget/data/types'

import { memoryconverttogadgetcontrollayer } from '../rendering'
import { BOARD } from '../types'

const mockedmemoryreadobject = jest.fn()
const mockedmemoryreadflags = jest.fn()

jest.mock('../boardaccess', () => ({
  memoryreadobject: (...args: unknown[]) => mockedmemoryreadobject(...args),
}))

jest.mock('../flags', () => ({
  memoryreadflags: (...args: unknown[]) => mockedmemoryreadflags(...args),
}))

function makeboard(over: Partial<BOARD> = {}): BOARD {
  return {
    id: 'bid',
    objects: {},
    terrain: [],
    ...over,
  } as unknown as BOARD
}

describe('memoryconverttogadgetcontrollayer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedmemoryreadflags.mockReturnValue({})
  })

  it('returns empty layer list when board is missing', () => {
    const result = memoryconverttogadgetcontrollayer('p1', 0, undefined)
    expect(result).toEqual([])
  })

  it('returns a control layer when player element is present on board', () => {
    mockedmemoryreadobject.mockReturnValue({ id: 'p1', x: 7, y: 3 })
    const board = makeboard({ camera: 'far' })

    const [control] = memoryconverttogadgetcontrollayer('p1', 1, board)

    expect(control.type).toBe(LAYER_TYPE.CONTROL)
    if (control.type !== LAYER_TYPE.CONTROL) {
      return
    }
    expect(control.focusid).toBe('p1')
    expect(control.focusx).toBe(7)
    expect(control.focusy).toBe(3)
    expect(control.viewscale).toBe(VIEWSCALE.FAR)
  })

  it('returns a control layer with stable viewscale when player element is missing', () => {
    // Prime focus/viewscale from a hydrated tick where the player was present.
    mockedmemoryreadobject.mockReturnValueOnce({ id: 'p2', x: 5, y: 9 })
    const board = makeboard({ camera: 'far' })
    const primed = memoryconverttogadgetcontrollayer('p2', 2, board)
    expect(primed).toHaveLength(1)

    // Simulate the board-hop race where the memory stream has hydrated
    // (player.board = B) but the B board stream has not (player not yet in
    // B.objects). Previously this returned [] and the client fell back to
    // VIEWSCALE.MID, flipping the zoom for a frame.
    mockedmemoryreadobject.mockReturnValueOnce(undefined)
    const [control] = memoryconverttogadgetcontrollayer('p2', 2, board)

    expect(control).toBeDefined()
    expect(control.type).toBe(LAYER_TYPE.CONTROL)
    if (control.type !== LAYER_TYPE.CONTROL) {
      return
    }
    expect(control.viewscale).toBe(VIEWSCALE.FAR)
    // focus stays pinned to the last known position so the client keeps
    // tracking smoothly through the transition.
    expect(control.focusx).toBe(5)
    expect(control.focusy).toBe(9)
    expect(control.focusid).toBe('p2')
  })

  it('prefers player flags over board flags when both are set', () => {
    mockedmemoryreadobject.mockReturnValue({ id: 'p3', x: 0, y: 0 })
    mockedmemoryreadflags.mockReturnValue({ camera: 'near' })
    const board = makeboard({ camera: 'far' })

    const [control] = memoryconverttogadgetcontrollayer('p3', 3, board)

    expect(control.type).toBe(LAYER_TYPE.CONTROL)
    if (control.type !== LAYER_TYPE.CONTROL) {
      return
    }
    expect(control.viewscale).toBe(VIEWSCALE.NEAR)
  })
})
