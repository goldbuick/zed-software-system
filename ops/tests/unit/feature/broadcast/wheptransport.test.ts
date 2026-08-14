import { WhepTransport } from 'zss/feature/broadcast/wheptransport'

class MockPeerConnection {
  connectionState = 'new'
  iceConnectionState = 'new'
  iceGatheringState = 'complete'
  onconnectionstatechange: (() => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  ontrack: ((event: RTCTrackEvent) => void) | null = null
  localDescription: RTCSessionDescriptionInit | undefined
  remoteDescription: RTCSessionDescriptionInit | undefined
  addTransceiver = jest.fn()
  addEventListener = jest.fn()
  removeEventListener = jest.fn()
  createOffer = jest.fn(async () => ({
    type: 'offer' as RTCSdpType,
    sdp: 'v=0 offer',
  }))
  setLocalDescription = jest.fn(async (desc: RTCSessionDescriptionInit) => {
    this.localDescription = desc
  })
  setRemoteDescription = jest.fn(async (desc: RTCSessionDescriptionInit) => {
    this.remoteDescription = desc
    this.connectionState = 'connected'
    this.onconnectionstatechange?.()
  })
  setConfiguration = jest.fn()
  close = jest.fn()
}

describe('WhepTransport', () => {
  const originalfetch = global.fetch
  const originalrtc = global.RTCPeerConnection

  beforeEach(() => {
    global.RTCPeerConnection =
      MockPeerConnection as unknown as typeof RTCPeerConnection
  })

  afterEach(() => {
    global.fetch = originalfetch
    global.RTCPeerConnection = originalrtc
    jest.restoreAllMocks()
  })

  it('posts recvonly offer with bearer and follows redirect', async () => {
    const fetchmock = jest
      .fn()
      .mockResolvedValueOnce({
        status: 307,
        ok: false,
        headers: {
          get: (name: string) =>
            name === 'Location' ? 'https://redirect.test/whep' : null,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => 'v=0 answer',
        headers: {
          get: (name: string) =>
            name === 'Location' ? '/whep/session' : null,
        },
      })
      .mockResolvedValueOnce({ ok: true, status: 204 })
    global.fetch = fetchmock as unknown as typeof fetch

    const transport = new WhepTransport()
    await transport.start({
      bearer: 'tok_test',
      endpoint: 'https://whep.test/whep',
    })

    expect(fetchmock).toHaveBeenNthCalledWith(
      1,
      'https://whep.test/whep',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok_test',
          'Content-Type': 'application/sdp',
          Accept: 'application/sdp',
        }),
      }),
    )
    expect(transport.getsessionid()).toBe('https://redirect.test/whep/session')
    expect(transport.getconnectionstate()).toBe('connected')

    const pc = transport.getpeerconnection() as unknown as MockPeerConnection
    expect(pc.addTransceiver).toHaveBeenCalledWith('video', {
      direction: 'recvonly',
    })
    expect(pc.addTransceiver).toHaveBeenCalledWith('audio', {
      direction: 'recvonly',
    })

    await transport.stop()
    expect(fetchmock).toHaveBeenNthCalledWith(
      3,
      'https://redirect.test/whep/session',
      expect.objectContaining({
        method: 'DELETE',
      }),
    )
  })
})
