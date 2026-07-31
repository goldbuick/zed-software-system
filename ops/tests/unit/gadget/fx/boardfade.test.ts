import {
  BOARDFADE_HOLD_MS,
  BOARDFADE_IN_MS,
  BOARDFADE_OUT_MS,
  resetboardfade,
  startboardfade,
  startboardfadein,
  startboardfadeout,
  useBoardFade,
} from 'zss/gadget/fx/boardfade'

describe('boardfade', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetboardfade()
  })

  afterEach(() => {
    resetboardfade()
    jest.useRealTimers()
  })

  it('animates out hold in then idle', () => {
    const onoutcomplete = jest.fn()
    startboardfade({ onoutcomplete })

    expect(useBoardFade.getState().phase).toBe('out')
    expect(useBoardFade.getState().alpha).toBe(0)

    // Steps accumulate 16ms; advance past out threshold.
    jest.advanceTimersByTime(BOARDFADE_OUT_MS + 16)
    expect(onoutcomplete).toHaveBeenCalledTimes(1)
    expect(useBoardFade.getState().phase).toBe('hold')
    expect(useBoardFade.getState().alpha).toBe(1)

    jest.advanceTimersByTime(BOARDFADE_HOLD_MS + 16)
    expect(useBoardFade.getState().phase).toBe('in')

    jest.advanceTimersByTime(BOARDFADE_IN_MS + 16)
    expect(useBoardFade.getState().phase).toBe('idle')
    expect(useBoardFade.getState().alpha).toBe(0)
  })

  it('restart cancels prior onoutcomplete', () => {
    const first = jest.fn()
    const second = jest.fn()
    startboardfade({ onoutcomplete: first })
    jest.advanceTimersByTime(BOARDFADE_OUT_MS / 2)
    startboardfade({ onoutcomplete: second })
    jest.advanceTimersByTime(BOARDFADE_OUT_MS + 16)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('startboardfadeout ends at black and holds', () => {
    startboardfadeout()
    jest.advanceTimersByTime(BOARDFADE_OUT_MS + 16)
    expect(useBoardFade.getState().alpha).toBe(1)
    expect(useBoardFade.getState().phase).toBe('hold')
  })

  it('startboardfadein ends clear from black', () => {
    useBoardFade.setState({ alpha: 1, phase: 'hold' })
    startboardfadein()
    jest.advanceTimersByTime(BOARDFADE_IN_MS + 16)
    expect(useBoardFade.getState().alpha).toBe(0)
    expect(useBoardFade.getState().phase).toBe('idle')
  })

  it('startboardfadein from clear starts at black then clears', () => {
    useBoardFade.setState({ alpha: 0, phase: 'idle' })
    startboardfadein()
    expect(useBoardFade.getState().alpha).toBe(1)
    expect(useBoardFade.getState().phase).toBe('in')
    jest.advanceTimersByTime(BOARDFADE_IN_MS + 16)
    expect(useBoardFade.getState().alpha).toBe(0)
    expect(useBoardFade.getState().phase).toBe('idle')
  })
})
