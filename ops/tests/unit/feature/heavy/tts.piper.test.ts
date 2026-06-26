import { requestinfo } from 'zss/feature/heavy/tts'

jest.mock('zss/device/api', () => ({
  workstatus: jest.fn(),
}))

jest.mock('zss/feature/heavy/pipertts', () => ({
  PiperTTS: {
    from_pretrained: jest.fn(),
    voices: [{ id: 'M1' }],
  },
}))

jest.mock('zss/feature/heavy/supertonictts', () => ({
  SupertonicTTS: {
    from_pretrained: jest.fn(),
    voices: [{ id: '0' }, { id: '1' }],
  },
}))

const device = { emit: jest.fn() }

describe('heavy tts piper info', () => {
  it('validate returns ok with trimmed model', async () => {
    const result = await requestinfo(
      device as any,
      'player1',
      'piper',
      'validate',
      'en/voice.onnx',
      'ignored',
    )
    expect(result).toEqual({ ok: true, model: 'ignored' })
  })

  it('validate fails when config empty', async () => {
    const result = await requestinfo(
      device as any,
      'player1',
      'piper',
      'validate',
      '',
      '',
    )
    expect(result).toEqual({ ok: false, errormsg: 'config is not set' })
  })

  it('config returns help when config empty', async () => {
    const lines = await requestinfo(
      device as any,
      'player1',
      'piper',
      'config',
      '',
      '',
    )
    expect(lines).toEqual([
      'ttsengine piper',
      'set config with #ttsengine piper <config>',
    ])
  })

  it('validate rejects opaque token config (e.g. fish api key)', async () => {
    const result = await requestinfo(
      device as any,
      'player1',
      'piper',
      'validate',
      '409b8aba9e6143979f196905e680fe9b',
      '',
    )
    expect(result).toEqual({
      ok: false,
      errormsg:
        'config must be a piper voice path (e.g. en/en_US/.../voice.onnx)',
    })
  })

  it('config ignores opaque token and shows help', async () => {
    const lines = await requestinfo(
      device as any,
      'player1',
      'piper',
      'config',
      '409b8aba9e6143979f196905e680fe9b',
      's2.1-pro',
    )
    expect(lines).toEqual([
      'ttsengine piper',
      'set config with #ttsengine piper <config>',
    ])
  })

  it('config shows path when set', async () => {
    const lines = await requestinfo(
      device as any,
      'player1',
      'piper',
      'config',
      'en/en_US/voice.onnx',
      '',
    )
    expect(lines).toEqual(['ttsengine piper config=en/en_US/voice.onnx'])
  })
})

describe('heavy tts supertonic info', () => {
  it('validate returns ok when config present', async () => {
    const result = await requestinfo(
      device as any,
      'player1',
      'supertonic',
      'validate',
      'any',
      'm1',
    )
    expect(result).toEqual({ ok: true, model: 'm1' })
  })
})
