import { registermemoryfsdetach, registermemoryfsstatus } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

export function registermemoryfscommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'memoryfs',
    [ARG_TYPE.NAME, 'memoryfs status|detach (operator only)'],
    (_, words) => {
      const [action] = readargs(words, 0, [ARG_TYPE.NAME])
      const player = READ_CONTEXT.elementfocus
      switch (NAME(action)) {
        case 'status':
          registermemoryfsstatus(SOFTWARE, player)
          break
        case 'detach':
          registermemoryfsdetach(SOFTWARE, player)
          break
        default:
          registermemoryfsstatus(SOFTWARE, player)
          break
      }
      return 0
    },
  )
}
