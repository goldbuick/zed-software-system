class MockSender {
  track: MediaStreamTrack | null
  private params: RTCRtpSendParameters

  constructor(track: MediaStreamTrack | null) {
    this.track = track
    this.params = {
      encodings: [{ rid: '0' }],
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
  connectionState = 'connected'
  iceConnectionState = 'connected'
  private readonly senders: MockSender[] = []

  addTrack = jest.fn((track: MediaStreamTrack) => {
    const sender = new MockSender(track)
    this.senders.push(sender)
    return sender
  })
  getSenders = jest.fn(() => this.senders)
}

describe('applyplayervideocaps', () => {
  afterEach(() => {
    jest.resetModules()
  })

  it('applies maxBitrate and maxFramerate on video sender only when connected', async () => {
    const { applyplayervideocaps } = await import(
      'ops/media-queue/ui/playervideocaps'
    )
    const pc = new MockPeerConnection()
    pc.addTrack({ kind: 'video' } as MediaStreamTrack)
    pc.addTrack({ kind: 'audio' } as MediaStreamTrack)

    await applyplayervideocaps(pc as unknown as RTCPeerConnection)

    const videosender = pc.getSenders().find((s) => s.track?.kind === 'video')
    const audiosender = pc.getSenders().find((s) => s.track?.kind === 'audio')
    expect(videosender?.setParameters).toHaveBeenCalled()
    expect(videosender?.getParameters().encodings?.[0]).toEqual(
      expect.objectContaining({
        rid: '0',
        maxBitrate: 3_000_000,
        maxFramerate: 30,
      }),
    )
    expect(audiosender?.setParameters).not.toHaveBeenCalled()
  })

  it('skips setParameters before the peer connection is connected', async () => {
    const { applyplayervideocaps } = await import(
      'ops/media-queue/ui/playervideocaps'
    )
    const pc = new MockPeerConnection()
    pc.connectionState = 'connecting'
    pc.iceConnectionState = 'checking'
    pc.addTrack({ kind: 'video' } as MediaStreamTrack)

    await applyplayervideocaps(pc as unknown as RTCPeerConnection)

    const videosender = pc.getSenders().find((s) => s.track?.kind === 'video')
    expect(videosender?.setParameters).not.toHaveBeenCalled()
  })

  it('reads mqdev videomaxbitratekbps override from preload bridge', async () => {
    ;(global as { window?: { mqdev?: { videomaxbitratekbps: string } } })
      .window = {
      mqdev: { videomaxbitratekbps: '4500' },
    }
    jest.resetModules()
    const { applyplayervideocaps } = await import(
      'ops/media-queue/ui/playervideocaps'
    )
    const pc = new MockPeerConnection()
    pc.addTrack({ kind: 'video' } as MediaStreamTrack)

    await applyplayervideocaps(pc as unknown as RTCPeerConnection)

    const videosender = pc.getSenders().find((s) => s.track?.kind === 'video')
    expect(videosender?.getParameters().encodings?.[0]?.maxBitrate).toBe(
      4_500_000,
    )
  })
})
