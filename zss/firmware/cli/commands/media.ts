import { bridgemediapanel, vmmediascroll } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

/** `#media` opens the queue scroll; `#media <peerid>` binds the Media Queue helper. */
export function registermediacommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'media',
    [ARG_TYPE.MAYBE_NAME, 'Board TV media queue (optional helper peer id)'],
    (_, words) => {
      const [maybepeerid] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      const player = READ_CONTEXT.elementfocus
      const peerid = maybepeerid?.trim() ?? ''
      if (peerid) {
        const board = memoryreadplayerboard(player)
        bridgemediapanel(SOFTWARE, player, 'bind', {
          peerid,
          boardid: board?.id ?? '',
          boardname: board?.name ?? '',
        })
      } else {
        vmmediascroll(SOFTWARE, player)
      }
      return 0
    },
  )
}