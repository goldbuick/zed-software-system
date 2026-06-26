import { WhipTransport } from 'zss/feature/broadcast/whiptransport'

class MockPeerConnection {
  connectionState = 'new'
  iceConnectionState = 'new'
  onconnectionstatechange: (() => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  localDescription: RTCSessionDescriptionInit | undefined
  remoteDescription: RTCSessionDescriptionInit | undefined

  addTrack = jest.fn()
  createOffer = jest.fn(async () => ({
    type: 'offer' as RTCSdpType,
    sdp: 'v=0',
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
  getStats = jest.fn(async () => new Map())
}

describe('WhipTransport', () => {
  const originalfetch = global.fetch
  const originalrtc = global.RTCPeerConnection

  beforeEach(() => {
    global.RTCPeerConnection = MockPeerConnection as unknown as typeof RTCPeerConnection
  })

  afterEach(() => {
    global.fetch = originalfetch
    global.RTCPeerConnection = originalrtc
    jest.restoreAllMocks()
  })

  it('posts sdp with bearer token and follows redirect', async () => {
    const fetchmock = jest
      .fn()
      .mockResolvedValueOnce({
        status: 307,
        ok: false,
        headers: {
          get: (name: string) =>
            name === 'Location' ? 'https://redirect.test/whip' : null,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => 'v=0',
        headers: {
          get: (name: string) =>
            name === 'Location' ? 'https://redirect.test/whip/session' : null,
        },
      })
      .mockResolvedValueOnce({ ok: true, status: 204 })
    global.fetch = fetchmock as unknown as typeof fetch

    const transport = new WhipTransport()
    await transport.start(
      { bearer: 'tok_test', endpoint: 'https://whip.test' },
      [{ kind: 'video' } as MediaStreamTrack],
    )

    expect(fetchmock).toHaveBeenNthCalledWith(
      1,
      'https://whip.test',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok_test',
          'Content-Type': 'application/sdp',
        }),
      }),
    )
    expect(fetchmock).toHaveBeenNthCalledWith(
      2,
      'https://redirect.test/whip',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok_test',
        }),
      }),
    )
    expect(transport.getsessionid()).toBe('https://redirect.test/whip/session')
    expect(transport.getconnectionstate()).toBe('connected')

    await transport.stop()
    expect(fetchmock).toHaveBeenNthCalledWith(
      3,
      'https://redirect.test/whip/session',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok_test',
        }),
      }),
    )
  })
})
