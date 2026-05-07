import { boardrunnerinput, vmpilotstart, vmpilotstop } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { INPUT, INPUT_SHIFT } from 'zss/gadget/data/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

const USERINPUT_MAP: Record<string, [INPUT, number]> = {
  up: [INPUT.MOVE_UP, 0],
  down: [INPUT.MOVE_DOWN, 0],
  left: [INPUT.MOVE_LEFT, 0],
  right: [INPUT.MOVE_RIGHT, 0],
  shootup: [INPUT.MOVE_UP, INPUT_SHIFT],
  shootdown: [INPUT.MOVE_DOWN, INPUT_SHIFT],
  shootleft: [INPUT.MOVE_LEFT, INPUT_SHIFT],
  shootright: [INPUT.MOVE_RIGHT, INPUT_SHIFT],
  ok: [INPUT.OK_BUTTON, 0],
  cancel: [INPUT.CANCEL_BUTTON, 0],
}

export function registerinputcommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command(
      'userinput',
      [ARG_TYPE.NAME, 'user input actions (up/down/left/right/etc)'],
      (_, words) => {
        const player = READ_CONTEXT.elementfocus
        const [action] = readargs(words, 0, [ARG_TYPE.NAME])
        const entry = USERINPUT_MAP[NAME(action)]
        if (entry) {
          // vminput(SOFTWARE, player, entry[0], entry[1])
          boardrunnerinput(SOFTWARE, player, entry[0], entry[1])
        }
        return 0
      },
    )
    .command(
      'pilot',
      [
        ARG_TYPE.ANY,
        'walk to coordinates or stop (e.g. #pilot 10 5, #pilot stop)',
      ],
      (_, words) => {
        const player = READ_CONTEXT.elementfocus
        const [first, ii] = readargs(words, 0, [ARG_TYPE.ANY])
        if (NAME(first) === 'stop') {
          vmpilotstop(SOFTWARE, player)
          return 0
        }
        const x = Number(first)
        const [second] = readargs(words, ii, [ARG_TYPE.ANY])
        const y = Number(second)
        if (isFinite(x) && isFinite(y)) {
          vmpilotstart(SOFTWARE, player, x, y)
        }
        return 0
      },
    )
}
