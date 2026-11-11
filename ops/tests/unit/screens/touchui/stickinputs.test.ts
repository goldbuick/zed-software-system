jest.mock('zss/gadget/device', () => ({
  useDeviceData: {
    getState: () => ({
      keyboardshift: false,
      keyboardctrl: false,
      keyboardalt: false,
    }),
  },
}))

const inputdown = jest.fn()
const inputup = jest.fn()

jest.mock('zss/gadget/userinput', () => ({
  inputdown: (...args: unknown[]) => inputdown(...args),
  inputup: (...args: unknown[]) => inputup(...args),
}))

import { INPUT } from 'zss/gadget/data/types'
import {
  handlestickdirsmerged,
  handlestickmergesreset,
  mergedsnapdir,
} from 'zss/screens/touchui/stickinputs'

describe('mergedsnapdir', () => {
  it('returns the non-null stick alone', () => {
    expect(mergedsnapdir(90, null)).toBe(90)
    expect(mergedsnapdir(null, 180)).toBe(180)
  })

  it('cancels opposing directions', () => {
    expect(mergedsnapdir(0, 180)).toBeNull()
  })

  it('merges adjacent diagonals', () => {
    expect(mergedsnapdir(90, 180)).toBe(135)
  })
})

describe('handlestickdirsmerged edge tracking', () => {
  beforeEach(() => {
    inputdown.mockClear()
    inputup.mockClear()
    handlestickmergesreset()
  })

  it('edges move keys once for a new snap, not again for the same snap', () => {
    handlestickdirsmerged(90, null, true)
    const downs = inputdown.mock.calls.filter(
      (c) => c[1] === INPUT.MOVE_UP,
    ).length
    expect(downs).toBe(1)

    inputdown.mockClear()
    inputup.mockClear()
    handlestickdirsmerged(90, null, true)
    expect(
      inputdown.mock.calls.filter((c) => c[1] === INPUT.MOVE_UP).length,
    ).toBe(0)
    expect(
      inputup.mock.calls.filter((c) =>
        [
          INPUT.MOVE_UP,
          INPUT.MOVE_DOWN,
          INPUT.MOVE_LEFT,
          INPUT.MOVE_RIGHT,
        ].includes(c[1] as INPUT),
      ).length,
    ).toBe(0)
  })

  it('re-edges when snap direction changes', () => {
    handlestickdirsmerged(90, null, true)
    inputdown.mockClear()
    inputup.mockClear()

    handlestickdirsmerged(180, null, true)
    expect(inputup).toHaveBeenCalled()
    expect(
      inputdown.mock.calls.some((c) => c[1] === INPUT.MOVE_RIGHT),
    ).toBe(true)
  })

  it('clears moves when pointer ends', () => {
    handlestickdirsmerged(90, null, true)
    inputup.mockClear()
    handlestickdirsmerged(null, null, false)
    expect(inputup).toHaveBeenCalledWith(0, INPUT.MOVE_UP)
  })
})
