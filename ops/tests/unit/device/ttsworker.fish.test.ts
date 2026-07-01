jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
}))

jest.mock('zss/feature/tts/inference', () => ({
  requestinfo: jest.fn(),
  requestaudiobytes: jest.fn(),
}))

import { apierror } from 'zss/device/api'
import { requestaudiobytes, requestinfo } from 'zss/feature/tts/inference'

type TtsHandler = (message: {
  target: string
  player: string
  session: string
  data: unknown
}) => void

let ttsHandler: TtsHandler | undefined
const reply = jest.fn()

jest.mock('zss/device', () => ({
  createdevice: jest.fn((_name, _subs, handler) => {
    ttsHandler = handler as TtsHandler
    return {
      session: (check?: { session: string }) =>
        check ? check.session : 'test-session',
      reply,
    }
  }),
}))

async function flushjobs() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('ttsworker fish dispatch', () => {
  beforeAll(async () => {
    await import('zss/device/ttsworker')
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  function dispatch(target: string, data: unknown, player = 'player1') {
    ttsHandler?.({
      target,
      player,
      session: 'test-session',
      data,
    })
  }

  it('forwards fish request 5-tuple to requestaudiobytes', async () => {
    const bytes = new ArrayBuffer(4)
    jest.mocked(requestaudiobytes).mockResolvedValue(bytes)
    dispatch('request', ['fish', 'api-key', 'ref-id', 'hello', 's2-pro'])
    await flushjobs()
    expect(requestaudiobytes).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'fish',
      'api-key',
      'ref-id',
      'hello',
      's2-pro',
    )
    expect(reply).toHaveBeenCalledWith(expect.anything(), 'tts:request', bytes)
  })

  it('replies undefined when fish request returns no bytes', async () => {
    jest.mocked(requestaudiobytes).mockResolvedValue(undefined)
    dispatch('request', ['fish', 'key', 'ref', 'hi', ''])
    await flushjobs()
    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      'tts:request',
      undefined,
    )
  })

  it('forwards fish info 4-tuple to requestinfo', async () => {
    jest.mocked(requestinfo).mockResolvedValue(['fish help'])
    dispatch('info', ['fish', 'voices', 'key', 's2-pro'])
    await flushjobs()
    expect(requestinfo).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'fish',
      'voices',
      'key',
      's2-pro',
    )
    expect(reply).toHaveBeenCalledWith(expect.anything(), 'tts:info', [
      'fish help',
    ])
  })

  it('logs worker crash via apierror', async () => {
    jest.mocked(requestaudiobytes).mockRejectedValue(new Error('boom'))
    dispatch('request', ['fish', 'key', 'ref', 'hi', ''])
    await flushjobs()
    expect(apierror).toHaveBeenCalled()
  })
})
