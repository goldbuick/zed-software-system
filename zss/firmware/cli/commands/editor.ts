import {
  registerfindany,
  registerinspector,
  registerperfmonitor,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { isarray } from 'zss/mapping/types'
import { ispt } from 'zss/words/dir'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

export function registereditorcommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command('gadget', ['built-in inspector'], () => {
      registerinspector(SOFTWARE, READ_CONTEXT.elementfocus, undefined)
      return 0
    })
    .command('perf', ['performance monitor overlay'], () => {
      registerperfmonitor(SOFTWARE, READ_CONTEXT.elementfocus, undefined)
      return 0
    })
    .command('findany', [ARG_TYPE.ANY, 'matched elements'], (_, words) => {
      const [maybeselection] = readargs(words, 0, [ARG_TYPE.ANY])
      if (isarray(maybeselection)) {
        const pts = maybeselection.filter(ispt)
        registerfindany(SOFTWARE, READ_CONTEXT.elementfocus, pts)
      } else {
        registerfindany(SOFTWARE, READ_CONTEXT.elementfocus, [])
      }
      return 0
    })
}
