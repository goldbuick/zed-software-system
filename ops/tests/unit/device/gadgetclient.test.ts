jest.mock('zss/device/registerplayer', () => ({
  registerreadplayer: jest.fn(() => 'p1'),
  registerwriteplayer: jest.fn(),
}))

jest.mock('zss/gadget/fx/crtanim', () => ({
  setcrtcurveamp: jest.fn(),
}))

jest.mock('zss/gadget/fx/glitchpulse', () => ({
  setglitchpulse: jest.fn(),
}))

const mockstartboardfade = jest.fn()
const mockstartboardfadeout = jest.fn()
const mockstartboardfadein = jest.fn()
const mockuseboardfadegetstate = jest.fn(() => ({
  alpha: 0,
  phase: 'idle' as const,
}))

jest.mock('zss/gadget/fx/boardfade', () => ({
  startboardfade: (...args: unknown[]) => mockstartboardfade(...args),
  startboardfadeout: (...args: unknown[]) => mockstartboardfadeout(...args),
  startboardfadein: (...args: unknown[]) => mockstartboardfadein(...args),
  resetboardfade: jest.fn(),
  useBoardFade: {
    getState: () => mockuseboardfadegetstate(),
  },
}))

const mocksetstate = jest.fn()
const mockreply = jest.fn()

let gadgethandler: (message: import('zss/device/api').MESSAGE) => void
let resetgadgetclientboardfade: () => void

jest.mock('zss/device', () => ({
  createdevice: jest.fn((_name, _topics, handler) => {
    gadgethandler = handler
    return {
      session: () => true,
      reply: mockreply,
    }
  }),
}))

jest.mock('zss/gadget/data/zustandstores', () => ({
  applylayercacheupdate: jest.fn((cache) => cache),
  emptygadgetstate: () => ({ id: 'empty', board: '', layers: [] }),
  ismaybeblankgadgetstate: jest.fn(() => false),
  useGadgetClient: {
    setState: mocksetstate,
  },
}))

import type { MESSAGE } from 'zss/device/api'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { encodepatchwire } from 'zss/feature/jsonpipe/wire'

describe('gadgetclient paint/patch apply', () => {
  beforeAll(async () => {
    const mod = await import('zss/device/gadgetclient')
    resetgadgetclientboardfade = mod.resetgadgetclientboardfade
  })

  beforeEach(() => {
    mocksetstate.mockClear()
    mockreply.mockClear()
    mockstartboardfade.mockClear()
    mockstartboardfadeout.mockClear()
    mockstartboardfadein.mockClear()
    mockuseboardfadegetstate.mockReturnValue({ alpha: 0, phase: 'idle' })
    resetgadgetclientboardfade()
  })

  it('applies paint via setState', () => {
    const snapshot = { id: 'board-1', board: 'board-1', layers: [{ z: 1 }] }
    gadgethandler({
      player: 'p1',
      target: 'paint',
      data: snapshot,
    } as MESSAGE)
    expect(mocksetstate).toHaveBeenCalled()
  })

  it('applies patch against fallback snapshot', () => {
    type gadgetsnapshot = { id: string; board: string; layers: { z: number }[] }
    const pipe = createjsonpipe<gadgetsnapshot>(
      { id: 'board-1', board: 'board-1', layers: [] },
      () => true,
    )
    const snapshot: gadgetsnapshot = {
      id: 'board-1',
      board: 'board-1',
      layers: [{ z: 1 }],
    }
    pipe.applyfullsync(snapshot)
    const patch = pipe.emitdiff({ ...snapshot, board: 'board-2' })
    gadgethandler({
      player: 'p1',
      target: 'paint',
      data: snapshot,
    } as MESSAGE)
    mocksetstate.mockClear()
    gadgethandler({
      player: 'p1',
      target: 'patch',
      data: encodepatchwire(patch),
    } as MESSAGE)
    expect(mocksetstate).toHaveBeenCalled()
  })

  it('ignores messages for other players', () => {
    gadgethandler({
      player: 'other',
      target: 'paint',
      data: { id: 'x', board: 'x', layers: [] },
    } as MESSAGE)
    expect(mocksetstate).not.toHaveBeenCalled()
  })

  it('gotofade starts boardfade', () => {
    gadgethandler({
      player: 'p1',
      target: 'gotofade',
      data: undefined,
    } as MESSAGE)
    expect(mockstartboardfade).toHaveBeenCalled()
  })

  it('fadeout starts boardfadeout', () => {
    gadgethandler({
      player: 'p1',
      target: 'fadeout',
      data: undefined,
    } as MESSAGE)
    expect(mockstartboardfadeout).toHaveBeenCalled()
  })

  it('fadein starts boardfadein', () => {
    gadgethandler({
      player: 'p1',
      target: 'fadein',
      data: undefined,
    } as MESSAGE)
    expect(mockstartboardfadein).toHaveBeenCalled()
  })

  it('defers board-changing paint during fade out then flushes', () => {
    mockuseboardfadegetstate.mockReturnValue({ alpha: 0.5, phase: 'out' })
    let outcomplete: (() => void) | undefined
    mockstartboardfade.mockImplementation(
      (opts?: { onoutcomplete?: () => void }) => {
        outcomplete = opts?.onoutcomplete
      },
    )

    const displayed = { id: 'board-1', board: 'board-1', layers: [{ z: 1 }] }

    gadgethandler({
      player: 'p1',
      target: 'gotofade',
      data: undefined,
    } as MESSAGE)

    const next = { id: 'board-2', board: 'board-2', layers: [{ z: 2 }] }
    mocksetstate.mockClear()
    gadgethandler({
      player: 'p1',
      target: 'paint',
      data: next,
    } as MESSAGE)

    expect(mocksetstate).toHaveBeenCalled()
    const updater = mocksetstate.mock.calls[0][0] as (s: {
      gadget: typeof displayed
      layercachemap: Map<string, unknown>
    }) => unknown
    const held = updater({
      gadget: displayed,
      layercachemap: new Map(),
    })
    expect(held).toEqual({
      gadget: displayed,
      layercachemap: expect.any(Map),
    })

    mocksetstate.mockClear()
    mockuseboardfadegetstate.mockReturnValue({ alpha: 1, phase: 'hold' })
    outcomplete?.()
    expect(mocksetstate).toHaveBeenCalled()
    const flushupdater = mocksetstate.mock.calls[0][0] as (s: {
      gadget: typeof displayed
      layercachemap: Map<string, unknown>
    }) => { gadget: typeof next }
    const flushed = flushupdater({
      gadget: displayed,
      layercachemap: new Map(),
    })
    expect(flushed.gadget.board).toBe('board-2')
  })
})
