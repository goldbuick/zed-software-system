jest.mock('zss/device/register', () => ({
  registerreadplayer: () => 'player',
}))

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
}))

jest.mock('zss/device/session', () => ({
  SOFTWARE: {},
}))

jest.mock('zss/feature/writeui', () => ({
  write: jest.fn(),
}))

jest.mock('zss/feature/synth/mp3', () => ({
  converttomp3: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}))

const rendermock = jest.fn()
jest.mock('ops/archive/synth/maxi/wasmofflinerender', () => ({
  renderwasmrecord: (...args: unknown[]) => rendermock(...args),
}))

import { createwasmrecordhandler } from 'ops/archive/synth/maxi/wasmrecordhandler'
import type { SYNTH_NOTE_ENTRY } from 'zss/feature/synth/playnotation'

describe('wasm record handler', () => {
  beforeEach(() => {
    rendermock.mockReset()
    rendermock.mockResolvedValue({
      numberOfChannels: 2,
      length: 44100,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(44100),
    })
  })

  it('exports via offline render path', async () => {
    const recording = {
      recordedticks: [[1, [0, '8n', 'c4']]] as SYNTH_NOTE_ENTRY[],
      recordlastpercent: 0,
      recordisrendering: 0,
    }
    const replay = {
      voicecfg: [],
      oscconfig: [],
      algoconfig: [],
      fxsab: [],
      playvolume: 80,
      bgplayvolume: 100,
    }
    const deps = {
      clearschedules: jest.fn(),
      applyreplay: jest.fn(),
      synthreplay: jest.fn(),
      setplayvolume: jest.fn(),
      setbgplayvolume: jest.fn(),
      getreplay: () => replay,
    }

    const { synthrecord } = createwasmrecordhandler({} as any, recording, deps)
    synthrecord('test.mp3')

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(rendermock).toHaveBeenCalledTimes(1)
    expect(rendermock.mock.calls[0][0]).toBe(replay)
    expect(deps.clearschedules).toHaveBeenCalled()
  })
})
