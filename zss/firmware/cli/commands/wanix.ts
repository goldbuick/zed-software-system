import { apierror, wanixkeep, wanixreplace, wanixshow, wanixstop } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

export function registerwanixcommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'wanix',
    [ARG_TYPE.MAYBE_NAME, 'bare: drop .wasm/.tgz to run; stop halts binary'],
    (_, words) => {
      const [action] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      const player = READ_CONTEXT.elementfocus
      if (!ispresent(action)) {
        wanixshow(SOFTWARE, player)
        return 0
      }
      switch (NAME(action)) {
        case 'stop':
          wanixstop(SOFTWARE, player)
          break
        case 'replace':
          wanixreplace(SOFTWARE, player)
          break
        case 'keep':
          wanixkeep(SOFTWARE, player)
          break
        default:
          apierror(
            SOFTWARE,
            player,
            'wanix',
            'drop a .wasm or .tgz — #wanix or #wanix stop',
          )
          break
      }
      return 0
    },
  )
}
