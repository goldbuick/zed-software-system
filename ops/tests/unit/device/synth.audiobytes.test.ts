jest.mock('zss/feature/synth/backend/synthbackendfactory', () => ({
  createsynthbackend: jest.fn(),
}))

jest.mock('zss/feature/synth/frontend/applyboardstate', () => ({
  applyboardstate: jest.fn(),
}))

const decodeAudioData = jest.fn()

jest.mock('zss/feature/synth/backend/wasm/audiocontextunlock', () => ({
  unlockaudiocontext: jest.fn(() => ({ decodeAudioData })),
  getliveaudiocontext: jest.fn(() => ({ decodeAudioData })),
}))

jest.mock('zss/feature/tts/client', () => ({
  applyttsengineconfig: jest.fn(),
  ttsclearqueue: jest.fn(),
  ttsinfo: jest.fn(),
  ttsplay: jest.fn(),
  ttsqueue: jest.fn(),
}))

jest.mock('zss/device/register', () => ({
  registerreadplayer: jest.fn(() => 'player1'),
}))

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
  apilog: jest.fn(),
  synthaudioenabled: jest.fn(),
  vmloader: jest.fn(),
  workstatus: jest.fn(),
}))

jest.mock('zss/feature/writeui', () => ({
  write: jest.fn(),
}))

import { createmessage } from 'zss/device'
import { setsynthdeviceteststate, synthdevice } from 'zss/device/synth'
import type { SynthBackend } from 'zss/feature/synth/frontend/synthbackend'

describe('synth device audiobytes', () => {
  const SESSION = 'synth-audiobytes-test'

  beforeEach(() => {
    jest.clearAllMocks()
    synthdevice.handle(createmessage('', '', 'vm', 'sessionreset'))
    synthdevice.handle(createmessage(SESSION, '', 'vm', 'ready'))
  })

  afterEach(() => {
    synthdevice.disconnect()
    setsynthdeviceteststate({ enabled: false, backend: undefined })
  })

  it('decodes a copy then plays; original ArrayBuffer stays intact', async () => {
    const playaudiobuffer = jest.fn()
    const backend = { playaudiobuffer } as unknown as SynthBackend
    setsynthdeviceteststate({ enabled: true, backend })

    const bytes = new ArrayBuffer(8)
    new Uint8Array(bytes).set([1, 2, 3, 4, 5, 6, 7, 8])
    const decoded = { duration: 0.5 } as AudioBuffer

    decodeAudioData.mockImplementation(async (input: ArrayBuffer) => {
      expect(input).not.toBe(bytes)
      expect(input.byteLength).toBe(8)
      return decoded
    })

    synthdevice.handle(
      createmessage(SESSION, 'player1', 'vm', 'synth:audiobytes', [
        '',
        bytes,
      ]),
    )

    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(decodeAudioData).toHaveBeenCalledTimes(1)
    expect(bytes.byteLength).toBe(8)
    expect(playaudiobuffer).toHaveBeenCalledWith(decoded)
  })
})
