import { bridgequeuepanel } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  mediapayloadwithmanage,
  mediarequiremanageonvm,
} from 'zss/feature/mediaqueue/mediaguards'
import { FIRMWARE } from 'zss/firmware'
import { QUEUE_ACTION_KEYWORDS } from 'zss/firmware/autocompleteconstants'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

const QUEUE_RESERVED = new Set([
  'skip',
  'limit',
  'clear',
  'stop',
  'approve',
  'reject',
])

/** `#queue` admin menu; `#queue <peerid>` binds helper; `#queue skip|clear|stop|limit` admin. */
export function registerqueuecommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'queue',
    [
      ARG_TYPE.MAYBE_NAME,
      'Media queue admin menu, bind helper, or manage queue',
    ],
    (_, words) => {
      const [first, iii] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      const player = READ_CONTEXT.elementfocus
      if (!first) {
        if (!mediarequiremanageonvm(player, 'queue')) {
          return 0
        }
        bridgequeuepanel(
          SOFTWARE,
          player,
          'menu',
          mediapayloadwithmanage(player),
        )
        return 0
      }
      const cmd = NAME(String(first))
      if (cmd === 'limit') {
        if (!mediarequiremanageonvm(player, 'queue')) {
          return 0
        }
        const [limitarg] = readargs(words, iii, [ARG_TYPE.NUMBER])
        bridgequeuepanel(
          SOFTWARE,
          player,
          'limit',
          mediapayloadwithmanage(player, { limit: String(limitarg) }),
        )
        return 0
      }
      if (cmd === 'skip' || cmd === 'clear' || cmd === 'stop') {
        if (!mediarequiremanageonvm(player, 'queue')) {
          return 0
        }
        bridgequeuepanel(SOFTWARE, player, cmd, mediapayloadwithmanage(player))
        return 0
      }
      if (cmd === 'approve' || cmd === 'reject') {
        if (!mediarequiremanageonvm(player, 'queue')) {
          return 0
        }
        const [indexarg] = readargs(words, iii, [ARG_TYPE.NUMBER])
        bridgequeuepanel(
          SOFTWARE,
          player,
          cmd,
          mediapayloadwithmanage(player, { index: String(indexarg) }),
        )
        return 0
      }
      if (QUEUE_RESERVED.has(cmd)) {
        bridgequeuepanel(SOFTWARE, player, cmd, mediapayloadwithmanage(player))
        return 0
      }
      if (!mediarequiremanageonvm(player, 'queue')) {
        return 0
      }
      const board = memoryreadplayerboard(player)
      bridgequeuepanel(SOFTWARE, player, 'bind', {
        ...mediapayloadwithmanage(player),
        peerid: String(first),
        boardid: board?.id ?? '',
        boardname: board?.name ?? '',
      })
      return 0
    },
    { byposition: [[...QUEUE_ACTION_KEYWORDS]] },
  )
}
