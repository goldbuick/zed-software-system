jest.mock('zss/device/register', () => ({
  registerreadplayer: jest.fn(() => 'p1'),
}))

jest.mock('zss/gadget/fx/crtanim', () => ({
  setcrtcurveamp: jest.fn(),
}))

jest.mock('zss/gadget/fx/glitchpulse', () => ({
  setglitchpulse: jest.fn(),
}))

jest.mock('zss/testsupport/hostmemorytrace', () => ({
  ishostmemorytraceenabled: jest.fn(() => false),
  tracehostmemory: jest.fn(),
}))

const mocksetstate = jest.fn()
const mockreply = jest.fn()

jest.mock('zss/device', () => ({
  createdevice: jest.fn((_name, _topics, handler) => {
    gadgethandler = handler
    return {
      session: () => true,
      reply: mockreply,
    }
  }),
}))

jest.mock('zss/gadget/data/state', () => ({
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

let gadgethandler: (message: MESSAGE) => void

describe('gadgetclient paint/patch apply', () => {
  beforeAll(async () => {
    await import('zss/device/gadgetclient')
  })

  beforeEach(() => {
    mocksetstate.mockClear()
    mockreply.mockClear()
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
})
