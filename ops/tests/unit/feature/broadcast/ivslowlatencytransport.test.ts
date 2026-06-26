import { IvsLowLatencyTransport } from 'zss/feature/broadcast/ivslowlatencytransport'

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
  close = jest.fn()
  getStats = jest.fn(async () => new Map())
}

describe('IvsLowLatencyTransport', () => {
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

  it('posts base64 offer and stream config to /v1/offer', async () => {
    const answer = btoa(JSON.stringify({ type: 'answer', sdp: 'v=0' }))
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ answer, ingestSessionId: 'sess-1' }),
    })) as unknown as typeof fetch

    const transport = new IvsLowLatencyTransport()
    const track = { kind: 'video' } as MediaStreamTrack
    await transport.start(
      { streamKey: 'sk_test', ingestEndpoint: 'https://example.test' },
      {
        maxResolution: { width: 1280, height: 720 },
        maxFramerate: 30,
        maxBitrate: 3500,
      },
      [track],
    )

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.test/v1/offer',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body as string,
    )
    expect(body.streamKey).toBe('sk_test')
    expect(body.maxBitrate).toBe(3500)
    expect(typeof body.offer).toBe('string')
    expect(JSON.parse(atob(body.offer)).type).toBe('offer')
    expect(transport.getsessionid()).toBe('sess-1')
    expect(transport.getconnectionstate()).toBe('connected')
  })

  it('surfaces fetch failures through onerror', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 403,
      json: async () => ({ message: 'bad key' }),
    })) as unknown as typeof fetch

    const transport = new IvsLowLatencyTransport()
    const onerror = jest.fn()
    transport.sethandlers({ onerror })

    await expect(
      transport.start(
        { streamKey: 'bad' },
        {
          maxResolution: { width: 1280, height: 720 },
          maxFramerate: 30,
          maxBitrate: 3500,
        },
        [{ kind: 'video' } as MediaStreamTrack],
      ),
    ).rejects.toThrow('bad key')
    expect(onerror).toHaveBeenCalledWith('bad key')
  })
})
