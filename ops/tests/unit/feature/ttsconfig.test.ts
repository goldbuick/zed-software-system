jest.mock('zss/device/api', () => ({
  registerstore: jest.fn(),
  apilog: jest.fn(),
  apierror: jest.fn(),
  ttsinfo: jest.fn(),
  ttsrequest: jest.fn(),
  synthaudiobuffer: jest.fn(),
}))

jest.mock('zss/feature/fishaudio', () => ({
  FISH_DEFAULT_MODEL: 's2.1-pro-free',
  maskfishapikey: (key: string) => (key ? '****' : '(not set)'),
  normalizemodel: (raw: string) => raw.trim(),
  requestfishaudiobytes: jest.fn(),
  describefishconfig: jest.fn(() => ({
    ok: true,
    lines: ['fish tts config: model=s2-pro api_key=****'],
  })),
}))

jest.mock('zss/feature/storage', () => ({
  storagereadconfigstring: jest.fn(),
}))

jest.mock('zss/feature/synth/backend/wasm/audiocontextunlock', () => ({
  getliveaudiocontext: jest.fn(),
  unlockaudiocontext: jest.fn(),
}))

import { apilog, registerstore } from 'zss/device/api'
import { describefishconfig } from 'zss/feature/fishaudio'
import { storagereadconfigstring } from 'zss/feature/storage'
import {
  applyttsengineconfig,
  restorettsenginefromstorage,
  storettsengineconfig,
} from 'zss/feature/tts'

describe('tts config persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('storettsengineconfig writes config_ keys via registerstore', () => {
    storettsengineconfig('player1', 'fish', 'secret-key', 's2-pro')
    expect(registerstore).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'config_ttsengine',
      'fish',
    )
    expect(registerstore).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'config_ttsengineconfig',
      'secret-key',
    )
    expect(registerstore).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'config_ttsenginemodel',
      's2-pro',
    )
  })

  it('restorettsenginefromstorage reads saved config keys', async () => {
    jest
      .mocked(storagereadconfigstring)
      .mockImplementation(async (name: string) => {
        if (name === 'ttsengine') {
          return 'fish'
        }
        if (name === 'ttsengineconfig') {
          return 'saved-key'
        }
        if (name === 'ttsenginemodel') {
          return 's2.1-pro'
        }
        return undefined
      })
    await restorettsenginefromstorage()
    expect(storagereadconfigstring).toHaveBeenCalledWith('ttsengine')
    expect(storagereadconfigstring).toHaveBeenCalledWith('ttsengineconfig')
    expect(storagereadconfigstring).toHaveBeenCalledWith('ttsenginemodel')
  })

  it('restorettsenginefromstorage skips when engine is missing', async () => {
    jest.mocked(storagereadconfigstring).mockResolvedValue(undefined)
    await restorettsenginefromstorage()
    expect(storagereadconfigstring).toHaveBeenCalledTimes(1)
  })

  it('applyttsengineconfig returns fish config lines without apilog when key omitted', async () => {
    await applyttsengineconfig('player1', 'fish', 'secret-key', 's2-pro')
    jest.clearAllMocks()
    const lines = await applyttsengineconfig('player1', 'fish', '', '')
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.join('\n')).toContain('fish tts config:')
    expect(describefishconfig).toHaveBeenCalledWith('secret-key', 's2-pro')
    expect(apilog).not.toHaveBeenCalled()
    expect(registerstore).not.toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'config_ttsengineconfig',
      '',
    )
  })

  it('applyttsengineconfig stores default model when model omitted', async () => {
    const lines = await applyttsengineconfig('player1', 'fish', 'secret-key', '')
    expect(lines).toEqual([])
    expect(apilog).not.toHaveBeenCalled()
    expect(registerstore).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'config_ttsenginemodel',
      's2.1-pro-free',
    )
  })
})
