import { boardrunnerinput } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { USERINPUT_ACTIONS } from 'zss/firmware/autocompleteconstants'
import { INPUT } from 'zss/gadget/data/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

const USERINPUT_MAP: Record<string, [INPUT, number]> = {
  up: [INPUT.MOVE_UP, 0],
  down: [INPUT.MOVE_DOWN, 0],
  left: [INPUT.MOVE_LEFT, 0],
  right: [INPUT.MOVE_RIGHT, 0],
  shootup: [INPUT.SHOOT_UP, 0],
  shootdown: [INPUT.SHOOT_DOWN, 0],
  shootleft: [INPUT.SHOOT_LEFT, 0],
  shootright: [INPUT.SHOOT_RIGHT, 0],
  ok: [INPUT.OK_BUTTON, 0],
  cancel: [INPUT.CANCEL_BUTTON, 0],
  a: [INPUT.BUTTON_A, 0],
  b: [INPUT.BUTTON_B, 0],
  x: [INPUT.BUTTON_X, 0],
  y: [INPUT.BUTTON_Y, 0],
  l1: [INPUT.BUTTON_L1, 0],
  l2: [INPUT.BUTTON_L2, 0],
  r1: [INPUT.BUTTON_R1, 0],
  r2: [INPUT.BUTTON_R2, 0],
}

export function registerinputcommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'userinput',
    [ARG_TYPE.NAME, 'user input actions (up/down/left/right/etc)'],
    (_, words) => {
      const player = READ_CONTEXT.elementfocus
      const [action] = readargs(words, 0, [ARG_TYPE.NAME])
      const entry = USERINPUT_MAP[NAME(action)]
      if (entry) {
        boardrunnerinput(SOFTWARE, player, entry[0], entry[1])
      }
      return 0
    },
    {
      byposition: [[...USERINPUT_ACTIONS]],
    },
  )
}
