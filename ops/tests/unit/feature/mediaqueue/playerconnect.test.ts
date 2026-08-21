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
  apierror: jest.fn(),
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
  mediaqueueisboundboard: jest.fn(() => false),
  mediaqueuereadhelperforboard: jest.fn(() => ''),
}))

jest.mock('zss/feature/mediaqueue/attachvideo', () => ({
  mediaqueueensurevideosink: jest.fn(),
  mediaqueueteardownplayersink: jest.fn(
    (opts: { call?: { close?: () => void } } = {}) => {
      opts.call?.close?.()
    },
  ),
}))

import { mediaqueueteardownplayersink } from 'zss/feature/mediaqueue/attachvideo'
import {
  mediaqueueconnectifonboard,
  mediaqueuedisconnect,
  mediaqueuereadplayerconnectstate,
  mediaqueueretryplayerconnect,
} from 'zss/feature/mediaqueue/playerconnect'
import { mediaqueuesetplayerlayerstate } from 'zss/feature/mediaqueue/playerlayerstate'
import { mediaqueueattachvideosink } from 'zss/feature/mediaqueue/sinkregistry'
import {
  mediaqueueisboundboard,
  mediaqueueislistening,
  mediaqueuereadhelperforboard,
} from 'zss/feature/mediaqueue/listenstate'
import {
  netterminalmediacall,
  netterminalregisterpeeropenhandler,
} from 'zss/feature/netterminal'

describe('mediaqueue player connect', () => {
  beforeEach(() => {
    mediaqueuedisconnect()
    jest.clearAllMocks()
    jest.mocked(netterminalmediacall).mockReset()
    jest.mocked(mediaqueueislistening).mockReturnValue(false)
    jest.mocked(mediaqueueisboundboard).mockReturnValue(false)
    jest.mocked(mediaqueuereadhelperforboard).mockReturnValue('')
  })

  afterEach(() => {
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
    jest.mocked(mediaqueueisboundboard).mockImplementation((id) => id === 'board-a')
    jest.mocked(mediaqueuereadhelperforboard).mockImplementation((id) =>
      id === 'board-a' ? 'helper-peer' : '',
    )
    mediaqueueconnectifonboard('', 'board-a')
    expect(netterminalmediacall).toHaveBeenCalledWith(
      'helper-peer',
      expect.any(MockMediaStream),
      { kind: 'mediaqueue', source: 'player' },
    )
  })

  it('retries player connect from existing layer state when playback starts', () => {
    const call = { on: jest.fn(), close: jest.fn() }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueuesetplayerlayerstate('helper-peer', 'board-a', true)
    mediaqueueretryplayerconnect()
    expect(netterminalmediacall).toHaveBeenCalledWith(
      'helper-peer',
      expect.any(MockMediaStream),
      { kind: 'mediaqueue', source: 'player' },
    )
  })

  it('does not redial from listen state when layer state is empty', () => {
    const call = { on: jest.fn(), close: jest.fn() }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    jest.mocked(mediaqueueislistening).mockReturnValue(true)
    jest.mocked(mediaqueueisboundboard).mockImplementation((id) => id === 'board-a')
    jest.mocked(mediaqueuereadhelperforboard).mockReturnValue('helper-peer')
    mediaqueueretryplayerconnect()
    expect(netterminalmediacall).not.toHaveBeenCalled()
  })

  it('disconnects when connecting off the bound board while listening', () => {
    const call = { on: jest.fn(), close: jest.fn() }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    jest.mocked(mediaqueueislistening).mockReturnValue(true)
    jest.mocked(mediaqueueisboundboard).mockImplementation((id) => id === 'board-a')
    jest.mocked(mediaqueuereadhelperforboard).mockImplementation((id) =>
      id === 'board-a' ? 'helper-peer' : '',
    )
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    mediaqueueconnectifonboard('helper-peer', 'board-b')
    expect(mediaqueueteardownplayersink).toHaveBeenCalled()
    expect(mediaqueuereadplayerconnectstate().hascall).toBe(false)
    expect(netterminalmediacall).toHaveBeenCalledTimes(1)
  })

  it('connects when walking onto another bound board', () => {
    const call = { on: jest.fn(), close: jest.fn() }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    jest.mocked(mediaqueueislistening).mockReturnValue(true)
    jest.mocked(mediaqueueisboundboard).mockReturnValue(true)
    jest.mocked(mediaqueuereadhelperforboard).mockImplementation((id) =>
      id === 'board-a' ? 'helper-a' : 'helper-b',
    )
    mediaqueueconnectifonboard('helper-a', 'board-a')
    mediaqueueconnectifonboard('helper-b', 'board-b')
    expect(netterminalmediacall).toHaveBeenCalledTimes(2)
    expect(mediaqueuereadplayerconnectstate()).toEqual({
      helperpeerid: 'helper-b',
      connectedboard: 'board-b',
      hascall: true,
      pendingconnect: false,
      hasstream: false,
    })
  })

  it('attaches stream from helper call when tracks are present', () => {
    const stream = new MockMediaStream()
    stream.addtrack({ kind: 'video' }, 'video')
    const handlers: Record<string, (arg: unknown) => void> = {}
    const call = {
      on: jest.fn((event: string, fn: (arg: unknown) => void) => {
        handlers[event] = fn
      }),
      close: jest.fn(),
      remoteStream: stream,
    }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    handlers.stream(stream)
    expect(mediaqueueattachvideosink).toHaveBeenCalledWith('mediaqueue', stream)
  })

  it('attaches when helper publishes tracks via peer connection receivers', () => {
    const trackhandlers: Array<(evt: { track: { kind: string }; streams: MediaStream[] }) => void> = []
    const statelisteners: Array<() => void> = []
    const pc = {
      iceConnectionState: 'connected',
      connectionState: 'connected',
      getReceivers: jest.fn(() => [] as Array<{ track?: { kind: string } }>),
      addEventListener: jest.fn(
        (event: string, fn: (evt: { track: { kind: string }; streams: MediaStream[] }) => void | (() => void)) => {
          if (event === 'track') {
            trackhandlers.push(fn as (evt: { track: { kind: string }; streams: MediaStream[] }) => void)
          }
          if (
            event === 'iceconnectionstatechange' ||
            event === 'connectionstatechange'
          ) {
            statelisteners.push(fn as () => void)
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
    trackhandlers[0]?.({ track: { kind: 'video' }, streams: [] })
    expect(mediaqueueattachvideosink).not.toHaveBeenCalled()
    return new Promise<void>((resolve) => {
      queueMicrotask(() => {
        expect(mediaqueueattachvideosink).toHaveBeenCalledWith(
          'mediaqueue',
          expect.any(MockMediaStream),
        )
        resolve()
      })
    })
  })

  it('does not attach muted placeholder receiver tracks', () => {
    const unmutevideo = jest.fn()
    const unmuteaudio = jest.fn()
    const pc = {
      iceConnectionState: 'new',
      connectionState: 'new',
      getReceivers: jest.fn(() => [
        {
          track: {
            kind: 'video',
            id: 'v-placeholder',
            muted: true,
            readyState: 'live',
            addEventListener: unmutevideo,
          },
        },
        {
          track: {
            kind: 'audio',
            id: 'a-placeholder',
            muted: true,
            readyState: 'live',
            addEventListener: unmuteaudio,
          },
        },
      ]),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
    const call = {
      on: jest.fn(),
      close: jest.fn(),
      peerConnection: pc,
    }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('mq_dead', 'board-a')
    expect(mediaqueueattachvideosink).not.toHaveBeenCalled()
    expect(mediaqueuereadplayerconnectstate().hasstream).toBe(false)
    expect(unmutevideo).toHaveBeenCalledWith(
      'unmute',
      expect.any(Function),
      expect.objectContaining({ once: true }),
    )
    expect(unmuteaudio).toHaveBeenCalledWith(
      'unmute',
      expect.any(Function),
      expect.objectContaining({ once: true }),
    )
  })

  it('probes remoteStream before track events', () => {
    const stream = new MockMediaStream()
    stream.addtrack({ kind: 'video' }, 'video')
    const call = {
      on: jest.fn(),
      close: jest.fn(),
      remoteStream: stream,
    }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    expect(mediaqueueattachvideosink).toHaveBeenCalledWith('mediaqueue', stream)
  })

  it('merges audio from receivers when remoteStream is video-only', async () => {
    const videostream = new MockMediaStream()
    videostream.addtrack({ kind: 'video' }, 'video')
    const trackhandlers: Array<
      (evt: { track: { kind: string }; streams: MediaStream[] }) => void
    > = []
    const pc = {
      iceConnectionState: 'connected',
      connectionState: 'connected',
      getReceivers: jest.fn(() => [] as Array<{ track?: { kind: string } }>),
      addEventListener: jest.fn(
        (
          event: string,
          fn: (evt: {
            track: { kind: string }
            streams: MediaStream[]
          }) => void | (() => void),
        ) => {
          if (event === 'track') {
            trackhandlers.push(fn)
          }
        },
      ),
      removeEventListener: jest.fn(),
    }
    const call = {
      on: jest.fn(),
      close: jest.fn(),
      remoteStream: videostream,
      peerConnection: pc,
    }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    pc.getReceivers.mockReturnValue([
      { track: { kind: 'video' } },
      { track: { kind: 'audio' } },
    ])
    expect(trackhandlers.length).toBeGreaterThan(0)
    trackhandlers[0]?.({ track: { kind: 'audio' }, streams: [] })
    await new Promise<void>((resolve) => queueMicrotask(resolve))
    const calls = jest.mocked(mediaqueueattachvideosink).mock.calls
    const last = calls[calls.length - 1]?.[1] as MockMediaStream
    expect(last.getAudioTracks()).toEqual([{ kind: 'audio' }])
    expect(last.getVideoTracks()).toEqual([{ kind: 'video' }])
  })

  it('does not redial join tabs from listen state without layer state', () => {
    const call = { on: jest.fn(), close: jest.fn() }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    jest.mocked(mediaqueueislistening).mockReturnValue(false)
    jest.mocked(mediaqueueisboundboard).mockReturnValue(true)
    jest.mocked(mediaqueuereadhelperforboard).mockReturnValue('helper-peer')
    mediaqueueretryplayerconnect()
    expect(netterminalmediacall).not.toHaveBeenCalled()
  })

  it('does not redial when disconnect close fires synchronously', () => {
    const handlers: Record<string, () => void> = {}
    let closed = false
    const call = {
      on: jest.fn((event: string, fn: () => void) => {
        handlers[event] = fn
      }),
      close: jest.fn(() => {
        if (closed) {
          return
        }
        closed = true
        handlers.close?.()
      }),
    }
    jest.mocked(netterminalmediacall).mockReturnValue(call as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    mediaqueuedisconnect()
    expect(netterminalmediacall).toHaveBeenCalledTimes(1)
    expect(mediaqueuereadplayerconnectstate().hascall).toBe(false)
  })

  it('redials when helper closes the call while still on the board', () => {
    const handlers: Record<string, () => void> = {}
    let closed = false
    const call = {
      on: jest.fn((event: string, fn: () => void) => {
        handlers[event] = fn
      }),
      close: jest.fn(() => {
        if (closed) {
          return
        }
        closed = true
        handlers.close?.()
      }),
    }
    const second = { on: jest.fn(), close: jest.fn() }
    jest
      .mocked(netterminalmediacall)
      .mockReturnValueOnce(call as never)
      .mockReturnValueOnce(second as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    handlers.close?.()
    expect(netterminalmediacall).toHaveBeenCalledTimes(2)
    expect(mediaqueuereadplayerconnectstate().hascall).toBe(true)
  })

  it('tears down a dead MediaConnection and redials', () => {
    const first = {
      on: jest.fn(),
      close: jest.fn(),
      peer: 'helper-peer',
      peerConnection: {
        iceConnectionState: 'failed',
        connectionState: 'failed',
        getReceivers: jest.fn(() => []),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
    }
    const second = { on: jest.fn(), close: jest.fn(), peer: 'helper-peer' }
    jest
      .mocked(netterminalmediacall)
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never)
    mediaqueueconnectifonboard('helper-peer', 'board-a')
    expect(netterminalmediacall).toHaveBeenCalledTimes(1)
    mediaqueueretryplayerconnect()
    expect(mediaqueueteardownplayersink).toHaveBeenCalled()
    expect(netterminalmediacall).toHaveBeenCalledTimes(2)
  })
})
