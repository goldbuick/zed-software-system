import {
  mediaqueuelayerconnectaction,
  type MEDIAQUEUE_LAYER_CONNECT_INPUT,
} from 'zss/feature/mediaqueue/playerlayerstate'

describe('mediaqueuelayerconnectaction', () => {
  function action(
    overrides: Partial<MEDIAQUEUE_LAYER_CONNECT_INPUT> = {},
  ) {
    const input: MEDIAQUEUE_LAYER_CONNECT_INPUT = {
      gadgetboard: 'board-a',
      activehelper: '',
      islistening: false,
      boundboard: '',
      boundhelper: '',
      layerhelper: '',
      layerboard: '',
      ...overrides,
    }
    return mediaqueuelayerconnectaction(input)
  }

  it('connects when helper layer is painted', () => {
    expect(action({ activehelper: 'helper-1' })).toEqual({
      kind: 'connect',
      helperpeerid: 'helper-1',
    })
  })

  it('connects from listen state when layer lags bind', () => {
    expect(
      action({
        islistening: true,
        boundhelper: 'helper-1',
        boundboard: 'board-a',
      }),
    ).toEqual({
      kind: 'connect',
      helperpeerid: 'helper-1',
    })
  })

  it('disconnects when layer state outlives gadget helper layer', () => {
    expect(
      action({
        layerhelper: 'helper-1',
        layerboard: 'board-a',
      }),
    ).toEqual({ kind: 'disconnect' })
  })

  it('no-ops for join tabs waiting for layer paint', () => {
    expect(action()).toEqual({ kind: 'noop' })
  })

  it('no-ops when gadget board is empty', () => {
    expect(action({ gadgetboard: '' })).toEqual({ kind: 'noop' })
  })

  it('no-ops empty gadget board even with a live layer connection', () => {
    expect(
      action({
        gadgetboard: '',
        islistening: true,
        boundhelper: 'helper-1',
        boundboard: 'board-a',
        layerhelper: 'helper-1',
        layerboard: 'board-a',
      }),
    ).toEqual({ kind: 'noop' })
  })

  it('disconnects when leaving the connected board', () => {
    expect(
      action({
        gadgetboard: 'board-b',
        islistening: true,
        boundhelper: 'helper-1',
        boundboard: 'board-a',
        layerhelper: 'helper-1',
        layerboard: 'board-a',
      }),
    ).toEqual({ kind: 'disconnect' })
  })

  it('no-ops on another board after layer state is cleared', () => {
    expect(
      action({
        gadgetboard: 'board-b',
        islistening: true,
        boundhelper: 'helper-1',
        boundboard: 'board-a',
      }),
    ).toEqual({ kind: 'noop' })
  })

  it('reconnects from listen state when returning to the bound board', () => {
    expect(
      action({
        gadgetboard: 'board-a',
        islistening: true,
        boundhelper: 'helper-1',
        boundboard: 'board-a',
      }),
    ).toEqual({
      kind: 'connect',
      helperpeerid: 'helper-1',
    })
  })
})
