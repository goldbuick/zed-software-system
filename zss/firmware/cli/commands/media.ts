import { vmmediascroll } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { READ_CONTEXT } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

/** `#media` opens the scroll-only board TV control surface. */
export function registermediacommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'media',
    [ARG_TYPE.MAYBE_NAME, 'Board TV media queue (scroll)'],
    () => {
      vmmediascroll(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    },
  )
}