import { WhipTransport } from 'zss/feature/broadcast/whiptransport'

class MockSender {
  track: MediaStreamTrack | null
  private params: RTCRtpSendParameters

  constructor(track: MediaStreamTrack | null) {
    this.track = track
    this.params = {
      encodings: [{}],
      transactionId: 'tx-1',
      codecs: [],
      headerExtensions: [],
      rtcp: { cname: '', reducedSize: false },
    }
  }

  getParameters = jest.fn(() => this.params)
  setParameters = jest.fn(async (next: RTCRtpSendParameters) => {
    this.params = next
  })
}

class MockPeerConnection {
  connectionState = 'new'
  iceConnectionState = 'new'
  onconnectionstatechange: (() => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  localDescription: RTCSessionDescriptionInit | undefined
  remoteDescription: RTCSessionDescriptionInit | undefined
  private readonly senders: MockSender[] = []

  addTrack = jest.fn((track: MediaStreamTrack) => {
    const sender = new MockSender(track)
    this.senders.push(sender)
    return sender
  })
  getSenders = jest.fn(() => this.senders)
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
      {
        maxResolution: { width: 1280, height: 720 },
        maxFramerate: 60,
        maxBitrate: 3500,
      },
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

  it('applies maxBitrate in bps and maxFramerate on video sender', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 201,
      text: async () => 'v=0',
      headers: {
        get: () => null,
      },
    })) as unknown as typeof fetch

    const transport = new WhipTransport()
    await transport.start(
      { bearer: 'tok_test', endpoint: 'https://whip.test' },
      {
        maxResolution: { width: 1280, height: 720 },
        maxFramerate: 60,
        maxBitrate: 3500,
      },
      [
        { kind: 'video' } as MediaStreamTrack,
        { kind: 'audio' } as MediaStreamTrack,
      ],
    )

    const pc = transport.getpeerconnection() as unknown as MockPeerConnection
    const videosender = pc.getSenders().find((s) => s.track?.kind === 'video')
    const audiosender = pc.getSenders().find((s) => s.track?.kind === 'audio')
    expect(videosender?.setParameters).toHaveBeenCalled()
    expect(videosender?.getParameters().encodings?.[0]).toEqual(
      expect.objectContaining({
        maxBitrate: 3_500_000,
        maxFramerate: 60,
      }),
    )
    expect(audiosender?.setParameters).not.toHaveBeenCalled()
  })
})
