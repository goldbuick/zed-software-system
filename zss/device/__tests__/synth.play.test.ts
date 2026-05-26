jest.mock('zss/feature/synth', () => ({
  createsynthbackend: jest.fn(),
  applyboardstate: jest.fn(),
}))

jest.mock('zss/feature/synth/backend/wasm', () => ({
  getwasmbroadcastdestination: jest.fn(),
  iswasmspikeenabled: jest.fn(() => false),
  playwasmaudiobuffer: jest.fn(),
  setwasmsynthttsvolume: jest.fn(),
  spikesynthwasm: jest.fn(),
  unlockmaximaudiocontext: jest.fn(),
}))

jest.mock('zss/feature/tts', () => ({
  selectttsengine: jest.fn(),
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
import { useGadgetClient } from 'zss/gadget/data/state'
import type { SynthBackend } from 'zss/feature/synth/frontend/synthbackend'

describe('synth device play routing', () => {
  const SESSION = 'synth-play-test'

  beforeEach(() => {
    synthdevice.handle(createmessage('', '', 'vm', 'sessionreset'))
    synthdevice.handle(createmessage(SESSION, '', 'vm', 'ready'))
  })

  afterEach(() => {
    synthdevice.disconnect()
    setsynthdeviceteststate({ enabled: false, backend: undefined })
  })

  function mockbackend() {
    return {
      addplay: jest.fn(),
      stopplay: jest.fn(),
    } as unknown as SynthBackend
  }

  function emitplay(board: string, buffer: string) {
    synthdevice.handle(
      createmessage(SESSION, 'player1', 'vm', 'synth:play', [board, buffer]),
    )
  }

  it('calls stopplay for empty buffer even when board does not match gadget board', () => {
    const backend = mockbackend()
    setsynthdeviceteststate({ enabled: true, backend })
    useGadgetClient.setState({
      gadget: { ...useGadgetClient.getState().gadget, board: 'board-a' },
    })

    emitplay('board-b', '')

    expect(backend.stopplay).toHaveBeenCalledTimes(1)
    expect(backend.addplay).not.toHaveBeenCalled()
  })

  it('calls stopplay for empty buffer on matching board', () => {
    const backend = mockbackend()
    setsynthdeviceteststate({ enabled: true, backend })
    useGadgetClient.setState({
      gadget: { ...useGadgetClient.getState().gadget, board: 'board-a' },
    })

    emitplay('board-a', '   ')

    expect(backend.stopplay).toHaveBeenCalledTimes(1)
    expect(backend.addplay).not.toHaveBeenCalled()
  })

  it('calls addplay only when board matches or is global', () => {
    const backend = mockbackend()
    setsynthdeviceteststate({ enabled: true, backend })
    useGadgetClient.setState({
      gadget: { ...useGadgetClient.getState().gadget, board: 'board-a' },
    })

    emitplay('board-b', 'c')
    expect(backend.addplay).not.toHaveBeenCalled()

    emitplay('board-a', 'c')
    expect(backend.addplay).toHaveBeenCalledWith('c')

    emitplay('', 'd')
    expect(backend.addplay).toHaveBeenCalledWith('d')
  })
})
