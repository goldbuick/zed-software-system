import {
  registernuke,
  registershare,
  vmflush,
  vmfork,
  vmhalt,
  vmlogout,
  vmrestart,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { vmflushop } from 'zss/firmware/cli/utils'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

export function registerstatecommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command('dev', ['dev mode / halt execution'], () => {
      vmhalt(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
    .command('share', ['share url'], () => {
      vmflushop()
      registershare(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
    .command('save', ['and persist current state'], () => {
      vmflush(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
    .command(
      'fork',
      [ARG_TYPE.MAYBE_NAME, 'tab with copy of state'],
      (_, words) => {
        const [address] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
        vmfork(SOFTWARE, READ_CONTEXT.elementfocus, address ?? '')
        return 0
      },
    )
    .command('nuke', ['a countdown and reloads into an empty state'], () => {
      registernuke(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
    .command('endgame', ['health to 0'], () => {
      vmlogout(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
    .command('restart', ['software, deletes all chip and player state'], () => {
      vmrestart(SOFTWARE, READ_CONTEXT.elementfocus)
      vmflushop()
      return 0
    })
}
