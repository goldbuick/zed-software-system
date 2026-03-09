import {
  apierror,
  bridgechatstart,
  bridgechatstop,
  bridgestart,
  bridgestreamstart,
  bridgestreamstop,
  bridgetab,
  vmadmin,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE } from 'zss/words/types'

export function registerMultiplayerCommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command('admin', ['admin scroll'], () => {
      vmadmin(SOFTWARE, READ_CONTEXT.elementfocus)
      return 0
    })
    .command(
      'joincode',
      [ARG_TYPE.MAYBE_NAME, 'multiplayer session (operator only)'],
      (_, words) => {
        const [maybehidden] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
        const playerboard = memoryreadplayerboard(READ_CONTEXT.elementfocus)
        if (ispresent(playerboard)) {
          bridgestart(SOFTWARE, READ_CONTEXT.elementfocus, !!maybehidden)
        } else {
          apierror(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'multiplayer',
            'need to have an active player on a board in order to start multiplayer',
          )
        }
        return 0
      },
    )
    .command(
      'jointab',
      [ARG_TYPE.MAYBE_NAME, 'new tab with the join url (operator only)'],
      (_, words) => {
        const [maybehidden] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
        bridgetab(SOFTWARE, READ_CONTEXT.elementfocus, !!maybehidden)
        return 0
      },
    )
    .command(
      'chat',
      [ARG_TYPE.MAYBE_NAME, 'twitch chat integration (operator only)'],
      (_, words) => {
        const [channel] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
        if (channel) {
          bridgechatstart(SOFTWARE, READ_CONTEXT.elementfocus, channel)
        } else {
          bridgechatstop(SOFTWARE, READ_CONTEXT.elementfocus)
        }
        return 0
      },
    )
    .command(
      'broadcast',
      [ARG_TYPE.MAYBE_NAME, 'stream broadcast (operator only)'],
      (_, words) => {
        const [streamkey] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
        if (streamkey) {
          bridgestreamstart(SOFTWARE, READ_CONTEXT.elementfocus, streamkey)
        } else {
          bridgestreamstop(SOFTWARE, READ_CONTEXT.elementfocus)
        }
        return 0
      },
    )
}
