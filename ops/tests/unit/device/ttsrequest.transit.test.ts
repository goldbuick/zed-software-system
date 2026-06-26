import { ttsinfo, ttsrequest } from 'zss/device/api'

describe('tts wire emit', () => {
  const device = { emit: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ttsrequest emits 5-tuple with model for fish', () => {
    ttsrequest(device as any, 'player1', 'fish', 'secret', 'ref1', 'hello', 's2-pro')
    expect(device.emit).toHaveBeenCalledWith('player1', 'tts:request', [
      'fish',
      'secret',
      'ref1',
      'hello',
      's2-pro',
    ])
  })

  it('ttsrequest emits empty model for piper', () => {
    ttsrequest(device as any, 'player1', 'piper', 'en/voice.onnx', '0', 'hello')
    expect(device.emit).toHaveBeenCalledWith('player1', 'tts:request', [
      'piper',
      'en/voice.onnx',
      '0',
      'hello',
      '',
    ])
  })

  it('ttsinfo emits 4-tuple for fish config', () => {
    ttsinfo(device as any, 'player1', 'fish', 'config', 'secret', 's2-pro')
    expect(device.emit).toHaveBeenCalledWith('player1', 'tts:info', [
      'fish',
      'config',
      'secret',
      's2-pro',
    ])
  })

  it('ttsinfo emits empty config and model for piper', () => {
    ttsinfo(device as any, 'player1', 'piper', 'voices')
    expect(device.emit).toHaveBeenCalledWith('player1', 'tts:info', [
      'piper',
      'voices',
      '',
      '',
    ])
  })
})
