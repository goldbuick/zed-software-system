import { registerinput, vmpilotstart, vmpilotstop } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { INPUT } from 'zss/gadget/data/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

export function registerinputcommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command(
      'userinput',
      [ARG_TYPE.NAME, 'user input actions (up/down/left/right/etc)'],
      (_, words) => {
        const player = READ_CONTEXT.elementfocus
        const [action] = readargs(words, 0, [ARG_TYPE.NAME])
        switch (NAME(action)) {
          case 'up':
            registerinput(SOFTWARE, player, INPUT.MOVE_UP, false)
            break
          case 'down':
            registerinput(SOFTWARE, player, INPUT.MOVE_DOWN, false)
            break
          case 'left':
            registerinput(SOFTWARE, player, INPUT.MOVE_LEFT, false)
            break
          case 'right':
            registerinput(SOFTWARE, player, INPUT.MOVE_RIGHT, false)
            break
          case 'shootup':
            registerinput(SOFTWARE, player, INPUT.MOVE_UP, true)
            break
          case 'shootdown':
            registerinput(SOFTWARE, player, INPUT.MOVE_DOWN, true)
            break
          case 'shootleft':
            registerinput(SOFTWARE, player, INPUT.MOVE_LEFT, true)
            break
          case 'shootright':
            registerinput(SOFTWARE, player, INPUT.MOVE_RIGHT, true)
            break
          case 'ok':
            registerinput(SOFTWARE, player, INPUT.OK_BUTTON, false)
            break
          case 'cancel':
            registerinput(SOFTWARE, player, INPUT.CANCEL_BUTTON, false)
            break
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
