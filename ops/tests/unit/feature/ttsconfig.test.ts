jest.mock('zss/device/api', () => ({
  registerstore: jest.fn(),
  apilog: jest.fn(),
  apierror: jest.fn(),
  ttsinfo: jest.fn(),
  ttsrequest: jest.fn(),
  synthaudiobuffer: jest.fn(),
}))

jest.mock('zss/device/session', () => ({
  SOFTWARE: { session: () => 'test-session' },
}))

jest.mock('zss/feature/storage', () => ({
  storagereadconfigstring: jest.fn(),
}))

jest.mock('zss/feature/synth/backend/wasm/audiocontextunlock', () => ({
  getliveaudiocontext: jest.fn(),
  unlockaudiocontext: jest.fn(),
}))

let workerhandler: ((message: { target: string; data?: unknown }) => void) | undefined

jest.mock('zss/device', () => ({
  createdevice: jest.fn((_id, _subs, handler) => {
    workerhandler = handler
    return { disconnect: jest.fn() }
  }),
}))

import { apilog, registerstore, ttsinfo } from 'zss/device/api'
import { storagereadconfigstring } from 'zss/feature/storage'
import {
  applyttsengineconfig,
  restorettsenginefromstorage,
  storettsengineconfig,
} from 'zss/feature/tts/client'

function replyinfo(data: unknown) {
  workerhandler?.({ target: 'tts:info', data })
}

describe('tts config persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    workerhandler = undefined
    jest.mocked(ttsinfo).mockImplementation((_device, _player, _engine, info) => {
      if (info === 'config') {
        replyinfo([
          'ttsengine fish model=s2-pro',
          'api_key=****',
          'fish tts config: model=s2-pro api_key=****',
        ])
      }
      if (info === 'validate') {
        replyinfo({ ok: true, model: 's2.1-pro-free' })
      }
    })
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

  it('applyttsengineconfig returns worker config lines when config omitted', async () => {
    await applyttsengineconfig('player1', 'fish', 'secret-key', 's2-pro')
    jest.clearAllMocks()
    const lines = await applyttsengineconfig('player1', 'fish', '', '')
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.join('\n')).toContain('fish tts config:')
    expect(registerstore).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'config_ttsengine',
      'fish',
    )
    expect(ttsinfo).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'fish',
      'config',
      expect.any(String),
      expect.any(String),
    )
    expect(apilog).not.toHaveBeenCalled()
  })

  it('applyttsengineconfig validates fish key against fish engine not current piper', async () => {
    jest.mocked(ttsinfo).mockImplementation(
      (_device, _player, engine, info, _config, _model) => {
        if (info === 'validate' && engine === 'fish') {
          replyinfo({ ok: true, model: 's2.1-pro-free' })
        }
        if (info === 'validate' && engine === 'piper') {
          replyinfo({
            ok: false,
            errormsg:
              'config must be a piper voice path (e.g. en/en_US/.../voice.onnx)',
          })
        }
      },
    )
    const lines = await applyttsengineconfig(
      'player1',
      'fish',
      '409b8aba9e6143979f196905e680fe9b',
      '',
    )
    expect(lines).toEqual([])
    expect(ttsinfo).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'fish',
      'validate',
      '409b8aba9e6143979f196905e680fe9b',
      '',
    )
    expect(apilog).toHaveBeenCalled()
    expect(registerstore).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'config_ttsengine',
      'fish',
    )
  })

  it('applyttsengineconfig drops fish api key when switching to piper', async () => {
    await applyttsengineconfig('player1', 'fish', '409b8aba9e6143979f196905e680fe9b', 's2-pro')
    jest.mocked(ttsinfo).mockImplementation(
      (_device, _player, engine, info, config) => {
        if (info === 'validate') {
          if (engine === 'piper') {
            replyinfo({
              ok: false,
              errormsg:
                'config must be a piper voice path (e.g. en/en_US/.../voice.onnx)',
            })
          } else {
            replyinfo({ ok: true, model: 's2-pro' })
          }
        }
        if (info === 'config' && engine === 'piper') {
          replyinfo([
            'ttsengine piper',
            'set config with #ttsengine piper <config>',
          ])
        }
      },
    )
    jest.clearAllMocks()
    const lines = await applyttsengineconfig('player1', 'piper', '', '')
    expect(lines).toEqual([
      'ttsengine piper',
      'set config with #ttsengine piper <config>',
    ])
    expect(ttsinfo).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'piper',
      'config',
      '',
      '',
    )
  })

  it('applyttsengineconfig persists engine and shows config for piper without config arg', async () => {
    jest.mocked(ttsinfo).mockImplementation((_device, _player, _engine, info) => {
      if (info === 'config') {
        replyinfo(['ttsengine piper', 'set config with #ttsengine piper <config>'])
      }
    })
    const lines = await applyttsengineconfig('player1', 'piper', '', '')
    expect(lines).toEqual([
      'ttsengine piper',
      'set config with #ttsengine piper <config>',
    ])
    expect(registerstore).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'config_ttsengine',
      'piper',
    )
    expect(apilog).not.toHaveBeenCalled()
  })

  it('applyttsengineconfig stores worker-validated default model when model omitted', async () => {
    jest.mocked(ttsinfo).mockImplementation((_device, _player, _engine, info) => {
      if (info === 'validate') {
        replyinfo({ ok: true, model: 's2.1-pro-free' })
      }
    })
    const lines = await applyttsengineconfig('player1', 'fish', 'secret-key', '')
    expect(lines).toEqual([])
    expect(apilog).toHaveBeenCalled()
    expect(registerstore).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'config_ttsenginemodel',
      's2.1-pro-free',
    )
  })
})
