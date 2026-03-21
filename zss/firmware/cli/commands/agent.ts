import {
  apierror,
  heavyagentlist,
  heavyagentstart,
  heavyagentstop,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { ispresent, isstring } from 'zss/mapping/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

export function registeragentcommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'agent',
    [ARG_TYPE.MAYBE_NAME, 'start/stop/list AI agents'],
    (_, words) => {
      const [action] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      switch (NAME(action)) {
        case 'start': {
          const [agentname] = readargs(words, 1, [ARG_TYPE.MAYBE_NAME])
          heavyagentstart(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            isstring(agentname) ? agentname : undefined,
          )
          break
        }
        case 'stop': {
          const [agentid] = readargs(words, 1, [ARG_TYPE.NAME])
          if (ispresent(agentid)) {
            heavyagentstop(SOFTWARE, READ_CONTEXT.elementfocus, agentid)
          } else {
            apierror(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              'agent',
              '#agent stop <id>',
            )
          }
          break
        }
        case '':
        case 'list':
        default:
          heavyagentlist(SOFTWARE, READ_CONTEXT.elementfocus)
          break
      }
      return 0
    },
  )
}
