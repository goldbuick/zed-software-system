import { bridgemediapanel } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { MEDIA_ACTION_KEYWORDS } from 'zss/firmware/autocompleteconstants'
import {
  mediapayloadwithmanage,
  mediarequiremanageonvm,
} from 'zss/feature/mediaqueue/mediaguards'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { READ_CONTEXT, readargs, readargsuntilend } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

const MEDIA_RESERVED = new Set([
  'add',
  'skip',
  'limit',
  'clear',
  'stop',
  'menu',
])

/** `#media` terminal menu; `#media <peerid>` binds; subcommands manage the queue. */
export function registermediacommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'media',
    [ARG_TYPE.MAYBE_NAME, 'Board TV media queue menu or helper peer id'],
    (_, words) => {
      const [first, iii] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      const player = READ_CONTEXT.elementfocus
      if (!first) {
        bridgemediapanel(
          SOFTWARE,
          player,
          'menu',
          mediapayloadwithmanage(player),
        )
        return 0
      }
      const cmd = NAME(String(first))
      if (cmd === 'add') {
        const [urlwords] = readargsuntilend(words, iii, ARG_TYPE.NUMBER_OR_STRING)
        const url = Array.isArray(urlwords) ? urlwords.join(' ') : String(urlwords ?? '')
        bridgemediapanel(
          SOFTWARE,
          player,
          'add',
          mediapayloadwithmanage(player, { url: url }),
        )
        return 0
      }
      if (cmd === 'limit') {
        if (!mediarequiremanageonvm(player)) {
          return 0
        }
        const [limitarg] = readargs(words, iii, [ARG_TYPE.NUMBER])
        bridgemediapanel(
          SOFTWARE,
          player,
          'limit',
          mediapayloadwithmanage(player, { limit: String(limitarg) }),
        )
        return 0
      }
      if (cmd === 'skip' || cmd === 'clear' || cmd === 'stop') {
        if (!mediarequiremanageonvm(player)) {
          return 0
        }
        bridgemediapanel(SOFTWARE, player, cmd, mediapayloadwithmanage(player))
        return 0
      }
      if (MEDIA_RESERVED.has(cmd)) {
        bridgemediapanel(SOFTWARE, player, cmd, mediapayloadwithmanage(player))
        return 0
      }
      if (!mediarequiremanageonvm(player)) {
        return 0
      }
      const board = memoryreadplayerboard(player)
      bridgemediapanel(SOFTWARE, player, 'bind', {
        ...mediapayloadwithmanage(player),
        peerid: String(first),
        boardid: board?.id ?? '',
        boardname: board?.name ?? '',
      })
      return 0
    },
    { byposition: [[...MEDIA_ACTION_KEYWORDS]] },
  )
}
