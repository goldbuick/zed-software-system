jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
  ttsinfo: jest.fn(),
  ttsrequest: jest.fn(),
  registerstore: jest.fn(),
  synthaudiobuffer: jest.fn(),
}))

jest.mock('zss/device/session', () => ({
  SOFTWARE: { session: () => 'test-session' },
}))

jest.mock('zss/feature/storage', () => ({
  storagereadconfigstring: jest.fn(),
}))

jest.mock('zss/feature/synth/backend/wasm/audiocontextunlock', () => ({
  getliveaudiocontext: jest.fn(() => ({
    decodeAudioData: jest.fn(async () => ({ duration: 1 })),
  })),
  unlockaudiocontext: jest.fn(),
}))

let workerhandler: ((message: { target: string; data?: unknown }) => void) | undefined

jest.mock('zss/device', () => ({
  createdevice: jest.fn((_id, _subs, handler) => {
    workerhandler = handler
    return { disconnect: jest.fn() }
  }),
}))

import { synthaudiobuffer, ttsrequest } from 'zss/device/api'
import { ttsqueue, ttsclearqueue } from 'zss/feature/tts/client'

describe('tts worker waiter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    workerhandler = undefined
    ttsclearqueue()
  })

  it('resolves undefined when worker replies with no bytes', async () => {
    jest.mocked(ttsrequest).mockImplementation(() => {
      workerhandler?.({ target: 'tts:request', data: undefined })
    })
    ttsqueue('player1', '', '0', 'hello')
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(ttsrequest).toHaveBeenCalled()
    expect(synthaudiobuffer).not.toHaveBeenCalled()
  })
})
