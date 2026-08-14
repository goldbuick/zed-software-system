/**
 * @jest-environment jsdom
 */

jest.mock('zss/feature/synth/backend/synthbackendfactory', () => ({
  createsynthbackend: jest.fn(
    () =>
      new Promise(() => {
        /* leave boot in flight */
      }),
  ),
}))

jest.mock('zss/feature/synth/frontend/applyboardstate', () => ({
  applyboardstate: jest.fn(),
}))

const unlockaudiocontext = jest.fn()
jest.mock('zss/feature/synth/backend/wasm/audiocontextunlock', () => ({
  unlockaudiocontext: (...args: unknown[]) => unlockaudiocontext(...args),
  getliveaudiocontext: jest.fn(),
}))

jest.mock('zss/feature/synth/volumeconfig', () => ({
  restorevolumesfromstorage: jest.fn(async () => undefined),
}))

jest.mock('zss/feature/tts/client', () => ({
  applyttsengineconfig: jest.fn(),
  ttsclearqueue: jest.fn(),
  ttsinfo: jest.fn(),
  ttsplay: jest.fn(),
  ttsqueue: jest.fn(),
}))

jest.mock('zss/device/registerplayer', () => ({
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
import {
  enableaudio,
  setsynthdeviceteststate,
  synthdevice,
} from 'zss/device/synth'

describe('enableaudio gesture unlock', () => {
  const SESSION = 'enableaudio-test'

  beforeEach(() => {
    unlockaudiocontext.mockClear()
    synthdevice.handle(createmessage('', '', 'vm', 'sessionreset'))
    synthdevice.handle(createmessage(SESSION, '', 'vm', 'ready'))
    setsynthdeviceteststate({ enabled: false, backend: undefined })
  })

  afterEach(() => {
    setsynthdeviceteststate({ enabled: false, backend: undefined })
    synthdevice.disconnect()
  })

  it('calls unlockaudiocontext on every enableaudio while boot is locked', () => {
    enableaudio()
    expect(unlockaudiocontext).toHaveBeenCalledTimes(1)

    enableaudio()
    enableaudio()
    expect(unlockaudiocontext).toHaveBeenCalledTimes(3)
  })

  it('still unlocks when already enabled', () => {
    setsynthdeviceteststate({ enabled: true, backend: undefined })
    enableaudio()
    expect(unlockaudiocontext).toHaveBeenCalledTimes(1)
  })
})
