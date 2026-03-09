import { vmzztrandom, vmzztsearch } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

export function registerZztCommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command(
      'zztsearch',
      [ARG_TYPE.NAME, ARG_TYPE.MAYBE_NAME, 'ZZT content by field and text'],
      (_, words) => {
        const [maybefield, maybetext] = readargs(words, 0, [
          ARG_TYPE.NAME,
          ARG_TYPE.MAYBE_NAME,
        ])
        const field = ispresent(maybetext) ? maybefield : 'title'
        const text = ispresent(maybetext) ? maybetext : maybefield
        vmzztsearch(SOFTWARE, READ_CONTEXT.elementfocus, field, text)
        return 0
      },
    )
    .command('zztrandom', ['random ZZT content'], () => {
      vmzztrandom(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
}
