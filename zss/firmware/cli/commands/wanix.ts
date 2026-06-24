import {
  apierror,
  wanixattach,
  wanixdetach,
  wanixshow,
  wanixstop,
  wanixvmstart,
  wanixvmstop,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

export function registerwanixcommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'wanix',
    [
      ARG_TYPE.MAYBE_NAME,
      'bare: drop .wasm/.tgz to run; menu for tasks and vms',
    ],
    (_, words) => {
      const [action, arg] = readargs(words, 0, [
        ARG_TYPE.MAYBE_NAME,
        ARG_TYPE.MAYBE_NAME,
      ])
      const player = READ_CONTEXT.elementfocus
      if (!ispresent(action)) {
        wanixshow(SOFTWARE, player)
        return 0
      }
      switch (NAME(action)) {
        case 'vm': {
          const sub = ispresent(arg) ? NAME(arg) : undefined
          if (sub === 'stop') {
            const [stoparg] = readargs(words, 2, [ARG_TYPE.MAYBE_NAME])
            wanixvmstop(
              SOFTWARE,
              player,
              ispresent(stoparg) ? NAME(stoparg) : undefined,
            )
          } else {
            wanixvmstart(
              SOFTWARE,
              player,
              ispresent(arg) ? NAME(arg) : undefined,
            )
          }
          break
        }
        case 'stop':
          wanixstop(SOFTWARE, player, ispresent(arg) ? NAME(arg) : undefined)
          break
        case 'detach':
          wanixdetach(SOFTWARE, player)
          break
        case 'attach':
          wanixattach(SOFTWARE, player, ispresent(arg) ? NAME(arg) : undefined)
          break
        default:
          apierror(
            SOFTWARE,
            player,
            'wanix',
            'drop a .wasm or .tgz — #wanix menu, vm, attach, stop, detach',
          )
          break
      }
      return 0
    },
  )
}
