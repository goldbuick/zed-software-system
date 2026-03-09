import {
  registernuke,
  registershare,
  vmfork,
  vmhalt,
  vmlogout,
  vmrestart,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

import { vmflushop } from '../utils'

export function registerstatecommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command('dev', ['dev mode / halt execution (operator only)'], () => {
      vmflushop()
      vmhalt(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
    .command('share', ['share url (operator only)'], () => {
      vmflushop()
      registershare(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
    .command('save', ['and persist current state (operator only)'], () => {
      vmflushop()
      return 0
    })
    .command(
      'fork',
      [ARG_TYPE.MAYBE_NAME, 'tab with copy of state (operator only)'],
      (_, words) => {
        const [address] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
        vmfork(SOFTWARE, READ_CONTEXT.elementfocus, address ?? '')
        return 0
      },
    )
    .command(
      'nuke',
      ['a countdown and reloads into an empty state (operator only)'],
      () => {
        registernuke(SOFTWARE, READ_CONTEXT.elementfocus)
        return 0
      },
    )
    .command('endgame', ['health to 0'], () => {
      vmlogout(SOFTWARE, READ_CONTEXT.elementfocus, false)
      return 0
    })
    .command(
      'restart',
      ['software, deletes all chip and player state (operator only)'],
      () => {
        vmrestart(SOFTWARE, READ_CONTEXT.elementfocus)
        vmflushop()
        return 0
      },
    )
}
