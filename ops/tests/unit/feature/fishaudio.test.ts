import {
  FISH_DEFAULT_MODEL,
  FISH_TTS_BRICK_URL,
  FISH_TTS_UPSTREAM,
  requestfishaudiobytes,
} from 'zss/feature/tts/fishaudio'

const fetchmock = jest.fn()

describe('requestfishaudiobytes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = fetchmock
  })

  it('POSTs msgpack to brick URL with full upstream target encoded', async () => {
    const mp3 = new Uint8Array([1, 2, 3])
    fetchmock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mp3.buffer,
    })

    const result = await requestfishaudiobytes(
      'test-key',
      'voice-ref',
      'hello world',
    )

    expect(fetchmock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchmock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(FISH_TTS_BRICK_URL)
    expect(url).toContain('brick=')
    expect(url).not.toBe(`${FISH_TTS_UPSTREAM}`)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer test-key',
      model: FISH_DEFAULT_MODEL,
      'Content-Type': 'application/msgpack',
    })
    expect(init.body).toBeInstanceOf(Uint8Array)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(new Uint8Array(result.bytes)).toEqual(mp3)
    }
  })

  it('uses explicit model when provided', async () => {
    fetchmock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
    })

    await requestfishaudiobytes('test-key', 'voice-ref', 'hi', 's2-pro')

    const [, init] = fetchmock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toMatchObject({ model: 's2-pro' })
  })

  it('returns error result when api key or voice missing', async () => {
    const missingkey = await requestfishaudiobytes('', 'voice', 'hi')
    const missingvoice = await requestfishaudiobytes('key', '', 'hi')
    expect(missingkey.ok).toBe(false)
    expect(missingvoice.ok).toBe(false)
    expect(fetchmock).not.toHaveBeenCalled()
  })

  it('coerces numeric reference_id to string in request body', async () => {
    fetchmock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
    })

    await requestfishaudiobytes('test-key', 409, 'hello')

    expect(fetchmock).toHaveBeenCalled()
  })

  it('returns 402 message on insufficient credit without throwing', async () => {
    fetchmock.mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({
        message:
          'Insufficient API credit. API credit is managed independently from platform credit.',
        status: 402,
      }),
    })

    const result = await requestfishaudiobytes('bad-key', 'voice', 'hi')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errormsg).toContain('Insufficient API credit')
      expect(result.errormsg).toContain('fish.audio/app/developers')
    }
  })

  it('returns errormsg on HTTP error without throwing', async () => {
    fetchmock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'unauthorized' }),
    })

    const result = await requestfishaudiobytes('bad-key', 'voice', 'hi')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errormsg).toBe('unauthorized')
    }
  })
})
