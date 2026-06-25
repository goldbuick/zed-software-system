import {
  FISH_API_BASE,
  FISH_DEFAULT_MODEL,
  buildfishttsrequestpayload,
  formatfishttsrequestlines,
  requestfishaudiobytes,
} from 'zss/feature/fishaudio'

const convertmock = jest.fn()

jest.mock('fish-audio', () => ({
  FishAudioClient: jest.fn().mockImplementation(() => ({
    textToSpeech: { convert: convertmock },
  })),
  FishAudioError: class FishAudioError extends Error {
    statusCode?: number
    body?: unknown
    constructor(opts: {
      message?: string
      statusCode?: number
      body?: unknown
    }) {
      super(opts.message ?? 'fish error')
      this.statusCode = opts.statusCode
      this.body = opts.body
    }
  },
}))

describe('requestfishaudiobytes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls SDK convert with api key, voice, and mp3 format', async () => {
    const mp3 = new Uint8Array([1, 2, 3])
    convertmock.mockResolvedValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(mp3)
          controller.close()
        },
      }),
    )

    const result = await requestfishaudiobytes(
      'test-key',
      'voice-ref',
      'hello world',
    )

    const { FishAudioClient } = jest.requireMock('fish-audio') as {
      FishAudioClient: jest.Mock
    }

    expect(FishAudioClient).toHaveBeenCalledWith({
      apiKey: 'test-key',
      baseUrl: FISH_API_BASE,
    })
    expect(convertmock).toHaveBeenCalledWith(
      { text: 'hello world', reference_id: 'voice-ref', format: 'mp3' },
      FISH_DEFAULT_MODEL,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(new Uint8Array(result.bytes)).toEqual(mp3)
    }
  })

  it('uses explicit model when provided', async () => {
    convertmock.mockResolvedValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1]))
          controller.close()
        },
      }),
    )

    await requestfishaudiobytes('test-key', 'voice-ref', 'hi', 's2-pro')

    expect(convertmock).toHaveBeenCalledWith(
      { text: 'hi', reference_id: 'voice-ref', format: 'mp3' },
      's2-pro',
    )
  })

  it('returns error result when api key or voice missing', async () => {
    const missingkey = await requestfishaudiobytes('', 'voice', 'hi')
    const missingvoice = await requestfishaudiobytes('key', '', 'hi')
    expect(missingkey.ok).toBe(false)
    expect(missingvoice.ok).toBe(false)
    expect(convertmock).not.toHaveBeenCalled()
  })

  it('coerces numeric reference_id to string for SDK', async () => {
    convertmock.mockResolvedValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1]))
          controller.close()
        },
      }),
    )

    await requestfishaudiobytes('test-key', 409, 'hello')

    expect(convertmock).toHaveBeenCalledWith(
      { text: 'hello', reference_id: '409', format: 'mp3' },
      FISH_DEFAULT_MODEL,
    )
  })

  it('formatfishttsrequestlines logs POST fields per Fish API', () => {
    const payload = buildfishttsrequestpayload(
      '536d3a5e000945adb7038665781a4aca',
      'Hello from zed.cafe',
      's2.1-pro',
    )
    const lines = formatfishttsrequestlines(
      payload,
      '409b8aba8e6143979f198905e680fe9b',
    )
    expect(lines.join('\n')).toContain('POST https://api.fish.audio/v1/tts')
    expect(lines.join('\n')).toContain('header model: s2.1-pro')
    expect(lines.join('\n')).toContain('reference_id: 536d3a5e000945adb7038665781a4aca')
    expect(lines.join('\n')).toContain('body text: Hello from zed.cafe')
    expect(lines.join('\n')).toContain('409b…fe9b')
  })

  it('returns 402 message on insufficient credit without throwing', async () => {
    const { FishAudioError } = jest.requireMock('fish-audio') as {
      FishAudioError: new (opts: {
        message?: string
        statusCode?: number
        body?: unknown
      }) => Error
    }
    convertmock.mockRejectedValue(
      new FishAudioError({
        statusCode: 402,
        message: 'Status code: 402',
        body: {
          message:
            'Insufficient API credit. API credit is managed independently from platform credit.',
          status: 402,
        },
      }),
    )

    const result = await requestfishaudiobytes('bad-key', 'voice', 'hi')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errormsg).toContain('Insufficient API credit')
      expect(result.errormsg).toContain('fish.audio/app/developers')
    }
  })

  it('returns errormsg on FishAudioError without throwing', async () => {
    const { FishAudioError } = jest.requireMock('fish-audio') as {
      FishAudioError: new (opts: { message?: string }) => Error
    }
    convertmock.mockRejectedValue(new FishAudioError({ message: 'unauthorized' }))

    const result = await requestfishaudiobytes('bad-key', 'voice', 'hi')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errormsg).toBe('unauthorized')
    }
  })
})
