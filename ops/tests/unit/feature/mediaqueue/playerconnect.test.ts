jest.mock('zss/device/registerplayer', () => ({
  registerreadplayer: jest.fn(() => 'p1'),
}))

class MockMediaStream {
  private listeners = new Map<string, Set<(event: { track: unknown }) => void>>()
  private videotracks: unknown[] = []
  private audiotracks: unknown[] = []

  constructor(tracks?: Array<{ kind?: string }>) {
    if (!tracks) {
      return
    }
    for (let i = 0; i < tracks.length; ++i) {
      const track = tracks[i]
      if (track?.kind === 'audio') {
        this.audiotracks.push(track)
      } else {
        this.videotracks.push(track)
      }
    }
  }

  getTracks() {
    return [...this.videotracks, ...this.audiotracks]
  }

  getVideoTracks() {
    return this.videotracks
  }

  getAudioTracks() {
    return this.audiotracks
  }

  addEventListener(
    event: string,
    fn: (event: { track: unknown }) => void,
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(fn)
  }

  removeEventListener(
    event: string,
    fn: (event: { track: unknown }) => void,
  ) {
    this.listeners.get(event)?.delete(fn)
  }

  addtrack(track: unknown, kind: 'video' | 'audio' = 'video') {
    if (kind === 'video') {
      this.videotracks.push(track)
    } else {
      this.audiotracks.push(track)
    }
    const handlers = this.listeners.get('addtrack')
    if (handlers) {
      handlers.forEach((fn) => fn({ track }))
    }
  }
}

global.MediaStream = MockMediaStream as never

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
}))

jest.mock('zss/feature/netterminal', () => ({
  netterminalmediacall: jest.fn(),
  netterminalregisterpeeropenhandler: jest.fn(),
}))

jest.mock('zss/feature/mediaqueue/bootstrap', () => ({
  mediaqueuebootstrap: jest.fn(),
}))

jest.mock('zss/feature/mediaqueue/sinkregistry', () => ({
  mediaqueueattachvideosink: jest.fn(),
}))

jest.mock('zss/feature/mediaqueue/listenstate', () => ({
  mediaqueuenotifyboardtvgate: jest.fn(),
  mediaqueueislistening: jest.fn(() => false),
  mediaqueuereadboundboardid: jest.fn(() => ''),
  mediaqueuereadhelperpeerid: jest.fn(() => ''),
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
  mediaqueueretryplayerconnect,
} from 'zss/feature/mediaqueue/playerconnect'
import { mediaqueueattachvideosink } from 'zss/feature/mediaqueue/sinkregistry'
import {
  mediaqueueislistening,
  mediaqueuereadboundboardid,
  mediaqueuereadhelperpeerid,
} from 'zss/feature/mediaqueue/listenstate'
import {
  netterminalmediacall,
  netterminalregisterpeeropenhandler,
} from 'zss/feature/netterminal'

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
      pendingconnect: false,
      hasstream: false,
    })
  })

  it('retries connect when peer opens after initial failure', () => {
    const call = { on: jest.fn(), close: jest.fn() }
    jest.mocked(netterminalmediacall).mockReturnValue(undefined as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    expect(netterminalmediacall).toHaveBeenCalledTimes(1)
    expect(mediaqueuereadplayerconnectstate().pendingconnect).toBe(true)
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    expect(netterminalmediacall).toHaveBeenCalledTimes(2)
    expect(mediaqueuereadplayerconnectstate().hascall).toBe(true)
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

  it('disconnects when helper layer is absent and queue is not listening', () => {
    const call = { on: jest.fn(), close: jest.fn() }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    mediaqueueconnectifonboard('', 'board-a')
    expect(mediaqueueteardownplayersink).toHaveBeenCalled()
    expect(netterminalmediacall).toHaveBeenCalledTimes(1)
  })

  it('keeps connect attempt when helper id missing but listen state matches board', () => {
    const call = { on: jest.fn(), close: jest.fn() }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    jest.mocked(mediaqueueislistening).mockReturnValue(true)
    jest.mocked(mediaqueuereadhelperpeerid).mockReturnValue('helper-peer')
    jest.mocked(mediaqueuereadboundboardid).mockReturnValue('board-a')
    mediaqueueconnectifonboard('', 'board-a')
    expect(netterminalmediacall).toHaveBeenCalledWith(
      'helper-peer',
      expect.any(MockMediaStream),
      { kind: 'mediaqueue', source: 'player' },
    )
  })

  it('retries player connect from listen state when playback starts', () => {
    const call = { on: jest.fn(), close: jest.fn() }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    jest.mocked(mediaqueueislistening).mockReturnValue(true)
    jest.mocked(mediaqueuereadhelperpeerid).mockReturnValue('helper-peer')
    jest.mocked(mediaqueuereadboundboardid).mockReturnValue('board-a')
    mediaqueueretryplayerconnect()
    expect(netterminalmediacall).toHaveBeenCalledWith(
      'helper-peer',
      expect.any(MockMediaStream),
      { kind: 'mediaqueue', source: 'player' },
    )
  })

  it('attaches stream from helper call when tracks are present', () => {
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
    stream.addtrack({ kind: 'video' }, 'video')
    handlers.stream(stream)
    expect(mediaqueueattachvideosink).toHaveBeenCalledWith('mediaqueue', stream)
  })

  it('attaches when helper publishes tracks via peer connection receivers', () => {
    const trackhandlers: Array<(evt: { track: { kind: string } }) => void> = []
    const pc = {
      getReceivers: jest.fn(() => [] as Array<{ track?: { kind: string } }>),
      addEventListener: jest.fn(
        (event: string, fn: (evt: { track: { kind: string } }) => void) => {
          if (event === 'track') {
            trackhandlers.push(fn)
          }
        },
      ),
      removeEventListener: jest.fn(),
    }
    const handlers: Record<string, (arg: unknown) => void> = {}
    const call = {
      on: jest.fn((event: string, fn: (arg: unknown) => void) => {
        handlers[event] = fn
      }),
      close: jest.fn(),
      peerConnection: pc,
    }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    expect(mediaqueueattachvideosink).not.toHaveBeenCalled()
    pc.getReceivers.mockReturnValue([{ track: { kind: 'video' } }])
    trackhandlers[0]?.({ track: { kind: 'video' } })
    expect(mediaqueueattachvideosink).toHaveBeenCalledWith(
      'mediaqueue',
      expect.any(MockMediaStream),
    )
  })
})
