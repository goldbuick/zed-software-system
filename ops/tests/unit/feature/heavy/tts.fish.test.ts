import {
  requestfishinfo,
  requestfishaudiobytesforworker,
} from 'zss/feature/heavy/ttsfish'
import { requestfishaudiobytes } from 'zss/feature/fishaudio'

jest.mock('zss/feature/fishaudio', () => ({
  FISH_DEFAULT_MODEL: 's2.1-pro-free',
  maskfishapikey: (key: string) => (key ? '****' : '(not set)'),
  normalizemodel: (raw: string) => raw.trim(),
  describefishconfig: jest.fn((key: string, model: string) => ({
    ok: key.trim().length > 0,
    lines: [`fish tts config: model=${model} api_key=****`],
    errormsg: 'api key is not set',
  })),
  requestfishaudiobytes: jest.fn(),
}))

jest.mock('zss/device/messagetypes', () => ({
  workerlogerror: jest.fn(),
}))

describe('heavy ttsfish', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns voice help for voices info', () => {
    const lines = requestfishinfo('', '', 'voices')
    expect(Array.isArray(lines)).toBe(true)
    expect(lines).toHaveLength(2)
  })

  it('returns validate ok with default model', () => {
    const result = requestfishinfo('secret-key', '', 'validate')
    expect(result).toEqual({ ok: true, model: 's2.1-pro-free' })
  })

  it('returns validate error when key missing', () => {
    const result = requestfishinfo('', '', 'validate')
    expect(result).toEqual({ ok: false, errormsg: 'api key is not set' })
  })

  it('requestfishaudiobytesforworker returns bytes on success', async () => {
    const bytes = new ArrayBuffer(8)
    jest.mocked(requestfishaudiobytes).mockResolvedValue({ ok: true, bytes })
    const device = { emit: jest.fn() }
    const result = await requestfishaudiobytesforworker(
      device,
      'player1',
      'key',
      'ref',
      'hello',
      's2-pro',
    )
    expect(result).toBe(bytes)
  })

  it('requestfishaudiobytesforworker returns undefined on failure', async () => {
    jest.mocked(requestfishaudiobytes).mockResolvedValue({
      ok: false,
      errormsg: 'unauthorized',
    })
    const device = { emit: jest.fn() }
    const result = await requestfishaudiobytesforworker(
      device,
      'player1',
      'key',
      'ref',
      'hello',
      's2-pro',
    )
    expect(result).toBeUndefined()
  })
})
