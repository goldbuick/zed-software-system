import {
  applyinputqueue,
  pushdir,
  type PLAYER_INPUT_FLAGS,
} from 'zss/firmware/elementinput'
import { INPUT } from 'zss/gadget/data/types'

function emptyflags(queue: [INPUT, number][] = []): PLAYER_INPUT_FLAGS {
  return {
    inputcurrent: 0,
    inputqueue: queue,
    inputmove: [],
    inputshoot: [],
    inputok: 0,
    inputcancel: 0,
    inputmenu: 0,
    inputa: 0,
    inputb: 0,
    inputx: 0,
    inputy: 0,
    inputl1: 0,
    inputl2: 0,
    inputr1: 0,
    inputr2: 0,
    inputalt: 0,
    inputctrl: 0,
    inputshift: 0,
  }
}

describe('pushdir', () => {
  it('keeps diagonals and drops opposing dirs', () => {
    expect(pushdir(['NORTH'], 'EAST')).toEqual(['NORTH', 'EAST'])
    expect(pushdir(['NORTH'], 'SOUTH')).toEqual(['SOUTH'])
  })
})

describe('applyinputqueue', () => {
  it('sets inputa for BUTTON_A without move or shift', () => {
    const flags = applyinputqueue(
      emptyflags([[INPUT.BUTTON_A, 0]]),
      undefined,
      undefined,
    )
    expect(flags.inputa).toBe(1)
    expect(flags.inputmove).toEqual([])
    expect(flags.inputshift).toBe(0)
  })

  it('coalesces diagonal MOVE_* into inputmove', () => {
    const flags = applyinputqueue(
      emptyflags([
        [INPUT.MOVE_UP, 0],
        [INPUT.MOVE_RIGHT, 0],
      ]),
      undefined,
      undefined,
    )
    expect(flags.inputmove).toEqual(['NORTH', 'EAST'])
    expect(flags.inputshoot).toEqual([])
  })

  it('coalesces diagonal SHOOT_* into inputshoot without inputmove', () => {
    const flags = applyinputqueue(
      emptyflags([
        [INPUT.SHOOT_UP, 0],
        [INPUT.SHOOT_RIGHT, 0],
      ]),
      undefined,
      undefined,
    )
    expect(flags.inputshoot).toEqual(['NORTH', 'EAST'])
    expect(flags.inputmove).toEqual([])
  })

  it('sets inputl2 for BUTTON_L2 without setting inputctrl', () => {
    const flags = applyinputqueue(
      emptyflags([[INPUT.BUTTON_L2, 0]]),
      undefined,
      undefined,
    )
    expect(flags.inputl2).toBe(1)
    expect(flags.inputctrl).toBe(0)
  })

  it('sets inputctrl for INPUT.CTRL', () => {
    const flags = applyinputqueue(
      emptyflags([[INPUT.CTRL, 0]]),
      undefined,
      undefined,
    )
    expect(flags.inputctrl).toBe(1)
    expect(flags.inputl2).toBe(0)
  })
})
