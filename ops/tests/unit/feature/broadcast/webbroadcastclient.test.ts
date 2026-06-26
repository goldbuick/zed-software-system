import {
  createwebbroadcastclient,
  parsebroadcaststartpayload,
} from 'zss/feature/broadcast/webbroadcastclient'

describe('parsebroadcaststartpayload', () => {
  it('maps legacy string to low-latency start', () => {
    expect(parsebroadcaststartpayload('sk_test')).toEqual({
      kind: 'ivs-low-latency',
      streamKey: 'sk_test',
    })
  })

  it('accepts explicit low-latency object', () => {
    expect(
      parsebroadcaststartpayload({
        kind: 'ivs-low-latency',
        streamKey: 'sk_test',
        ingestEndpoint: 'https://ingest.test',
      }),
    ).toEqual({
      kind: 'ivs-low-latency',
      streamKey: 'sk_test',
      ingestEndpoint: 'https://ingest.test',
    })
  })

  it('accepts generic whip object', () => {
    expect(
      parsebroadcaststartpayload({
        kind: 'whip',
        endpoint: 'https://whip.test/ingest',
        bearer: 'tok_test',
      }),
    ).toEqual({
      kind: 'whip',
      endpoint: 'https://whip.test/ingest',
      bearer: 'tok_test',
    })
  })

  it('accepts ivs-whip object', () => {
    expect(
      parsebroadcaststartpayload({
        kind: 'ivs-whip',
        token: 'tok_test',
        endpoint: 'https://whip.test',
      }),
    ).toEqual({
      kind: 'ivs-whip',
      token: 'tok_test',
      endpoint: 'https://whip.test',
    })
  })
})

describe('WebBroadcastClient lifecycle', () => {
  class MockPeerConnection {
    connectionState = 'connected'
    iceConnectionState = 'connected'
    onconnectionstatechange: (() => void) | null = null
    oniceconnectionstatechange: (() => void) | null = null
    addTrack = jest.fn()
    createOffer = jest.fn(async () => ({ type: 'offer', sdp: 'v=0' }))
    setLocalDescription = jest.fn(async () => {})
    setRemoteDescription = jest.fn(async () => {})
    close = jest.fn()
    getStats = jest.fn(async () => new Map())
  }

  const originalfetch = global.fetch
  const originalrtc = global.RTCPeerConnection
  const originalraf = global.requestAnimationFrame
  const originalcaf = global.cancelAnimationFrame
  const originaldocument = global.document
  const originalmediastream = global.MediaStream

  beforeEach(() => {
    global.MediaStream = jest.fn((tracks?: MediaStreamTrack[]) => ({
      getAudioTracks: () => tracks ?? [],
      getVideoTracks: () => [],
      id: 'mock-stream',
    })) as unknown as typeof MediaStream
    global.RTCPeerConnection = MockPeerConnection as unknown as typeof RTCPeerConnection
    global.requestAnimationFrame = jest.fn(() => 1)
    global.cancelAnimationFrame = jest.fn()
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        answer: btoa(JSON.stringify({ type: 'answer', sdp: 'v=0' })),
        ingestSessionId: 'sess-1',
      }),
    })) as unknown as typeof fetch

    global.document = {
      createElement: jest.fn(() => {
        const canvas = {
          width: 1280,
          height: 720,
          getContext: () => ({
            clearRect: jest.fn(),
            fillRect: jest.fn(),
            drawImage: jest.fn(),
            fillStyle: '',
          }),
          captureStream: () => ({
            getVideoTracks: () => [{ kind: 'video', requestFrame: jest.fn() }],
            requestFrame: jest.fn(),
          }),
        }
        return canvas
      }),
    } as unknown as Document

    global.AudioContext = jest.fn().mockImplementation(() => ({
      state: 'running',
      resume: jest.fn(async () => {}),
      close: jest.fn(async () => {}),
      createConstantSource: () => ({
        connect: jest.fn(),
        start: jest.fn(),
      }),
      createGain: () => ({
        gain: { value: 1 },
        connect: jest.fn(),
      }),
      createMediaStreamDestination: () => ({
        stream: { getAudioTracks: () => [{ kind: 'audio' }] },
      }),
      createMediaStreamSource: () => ({
        connect: jest.fn(),
      }),
    })) as unknown as typeof AudioContext
  })

  afterEach(() => {
    global.fetch = originalfetch
    global.RTCPeerConnection = originalrtc
    global.requestAnimationFrame = originalraf
    global.cancelAnimationFrame = originalcaf
    global.document = originaldocument
    global.MediaStream = originalmediastream
    jest.restoreAllMocks()
  })

  it('forwards active and connection events', async () => {
    const client = createwebbroadcastclient()
    const active = jest.fn()
    const connection = jest.fn()
    client.on('activestatechange', active)
    client.on('connectionstatechange', connection)

    await client.addimagesource(
      { width: 640, height: 480 } as CanvasImageSource & {
        width: number
        height: number
      },
      'video',
      { index: 1 },
    )
    await client.addaudioinputdevice(
      { getAudioTracks: () => [{ kind: 'audio' }] } as MediaStream,
      'audio',
    )
    await client.start({ kind: 'ivs-low-latency', streamKey: 'sk_test' })

    expect(active).toHaveBeenCalledWith(true)
    expect(connection).toHaveBeenCalled()
    expect(client.getconnectionstate()).toBe('connected')
    expect(client.getsessionid()).toBe('sess-1')

    client.stop()
    expect(active).toHaveBeenCalledWith(false)
  })

  it('rejects duplicate start', async () => {
    const client = createwebbroadcastclient()
    await client.addimagesource(
      { width: 640, height: 480 } as CanvasImageSource & {
        width: number
        height: number
      },
      'video',
      { index: 1 },
    )
    await client.start({ kind: 'ivs-low-latency', streamKey: 'sk_test' })
    await expect(
      client.start({ kind: 'ivs-low-latency', streamKey: 'sk_test' }),
    ).rejects.toThrow('already started')
  })
})
