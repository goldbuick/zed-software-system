import {
  apierror,
  vmagentlist,
  vmagentprompt,
  vmagentstart,
  vmagentstop,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { ispresent, isstring } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

export function registeragentcommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'agent',
    [ARG_TYPE.MAYBE_NAME, '/stop/list AI agents; prompt with <id> <values>'],
    (_, words) => {
      const [action, ii] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      switch (NAME(action)) {
        case 'start':
          vmagentstart(SOFTWARE, READ_CONTEXT.elementfocus)
          break
        case 'stop': {
          const [agentid] = readargs(words, 1, [ARG_TYPE.NAME])
          if (ispresent(agentid)) {
            vmagentstop(SOFTWARE, READ_CONTEXT.elementfocus, agentid)
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
          vmagentlist(SOFTWARE, READ_CONTEXT.elementfocus)
          break
        default: {
          if (isstring(action)) {
            let iii = ii
            const values: any[] = []
            while (iii < words.length) {
              const [value, iiii] = readargs(words, iii, [ARG_TYPE.ANY])
              values.push(value)
              iii = iiii
            }
            vmagentprompt(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              action,
              values.map(maptostring).join(' '),
            )
          } else {
            apierror(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              'agent',
              '#agent <id> <prompt>',
            )
          }
          break
        }
      }
      return 0
    },
  )
}
