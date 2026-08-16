jest.mock('zss/device/registerplayer', () => ({
  registerreadplayer: jest.fn(() => 'p1'),
}))

class MockMediaStream {
  getTracks() {
    return []
  }
}

global.MediaStream = MockMediaStream as never

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
}))

jest.mock('zss/feature/netterminal', () => ({
  netterminalmediacall: jest.fn(),
}))

jest.mock('zss/feature/mediaqueue/receive', () => ({
  mediaqueuebootstrap: jest.fn(),
}))

jest.mock('zss/feature/mediaqueue/sinkregistry', () => ({
  mediaqueueattachvideosink: jest.fn(),
}))

jest.mock('zss/feature/mediaqueue/attachvideo', () => ({
  mediaqueueensurevideosink: jest.fn(),
  mediaqueueteardownplayersink: jest.fn(),
}))

import { mediaqueueteardownplayersink } from 'zss/feature/mediaqueue/attachvideo'
import {
  mediaqueueconnectifonboard,
  mediaqueuedisconnect,
  mediaqueuereadplayerconnectstate,
} from 'zss/feature/mediaqueue/playerconnect'
import { mediaqueueattachvideosink } from 'zss/feature/mediaqueue/sinkregistry'
import { netterminalmediacall } from 'zss/feature/netterminal'

describe('mediaqueue player connect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaqueuedisconnect()
  })

  it('opens a player MediaConnection when helper layer is on board', () => {
    const call = {
      on: jest.fn(),
      close: jest.fn(),
    }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    expect(netterminalmediacall).toHaveBeenCalledWith(
      'helper-peer',
      expect.any(MockMediaStream),
      { kind: 'mediaqueue', source: 'player' },
    )
    expect(mediaqueuereadplayerconnectstate()).toEqual({
      helperpeerid: 'helper-peer',
      connectedboard: 'board-a',
      hascall: true,
    })
  })

  it('is idempotent for same board and helper', () => {
    const call = { on: jest.fn(), close: jest.fn() }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    expect(netterminalmediacall).toHaveBeenCalledTimes(1)
  })

  it('disconnect tears down sink and clears state', () => {
    const call = { on: jest.fn(), close: jest.fn() }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    mediaqueuedisconnect()
    expect(mediaqueueteardownplayersink).toHaveBeenCalled()
    expect(mediaqueuereadplayerconnectstate().hascall).toBe(false)
  })

  it('disconnects when helper layer is absent', () => {
    const call = { on: jest.fn(), close: jest.fn() }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    mediaqueueconnectifonboard('', 'board-a')
    expect(mediaqueueteardownplayersink).toHaveBeenCalled()
    expect(netterminalmediacall).toHaveBeenCalledTimes(1)
  })

  it('attaches stream from helper call', () => {
    const handlers: Record<string, (arg: unknown) => void> = {}
    const call = {
      on: jest.fn((event: string, fn: (arg: unknown) => void) => {
        handlers[event] = fn
      }),
      close: jest.fn(),
    }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    const stream = new MockMediaStream()
    handlers.stream(stream)
    expect(mediaqueueattachvideosink).toHaveBeenCalledWith('mediaqueue', stream)
  })
})
