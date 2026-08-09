import {
  registerairsharereceive,
  registerairsharesend,
  registerairsharestop,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

export function registerairsharecommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'airshare',
    [ARG_TYPE.MAYBE_NAME, 'optical MEMORY transfer (send|receive)'],
    (_, words) => {
      const [maybe] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      const mode = NAME(maybe ?? 'send')
      const player = READ_CONTEXT.elementfocus
      if (mode === 'receive' || mode === 'recv') {
        registerairsharereceive(SOFTWARE, player)
        return 0
      }
      if (mode === 'stop') {
        registerairsharestop(SOFTWARE, player)
        return 0
      }
      // send (default)
      registerairsharesend(SOFTWARE, player)
      return 0
    },
  )
}
