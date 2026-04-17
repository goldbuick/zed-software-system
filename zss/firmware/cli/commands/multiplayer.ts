import {
  apierror,
  apilog,
  bridgechatlist,
  bridgechatstart,
  bridgechatstop,
  bridgestart,
  bridgestreamstart,
  bridgestreamstop,
  bridgetab,
  vmadmin,
} from 'zss/device/api'
import { normalizechatkind } from 'zss/device/bridge/chattypes'
import { SOFTWARE } from 'zss/device/session'
import {
  buildchatstartforkind,
  resolvechatstartwords,
} from 'zss/feature/bridgechatcli'
import {
  bridgedeleteprofile,
  bridgereadallprofiles,
  bridgereadprofile,
  bridgewriteprofile,
} from 'zss/feature/bridgeprofiles'
import { FIRMWARE } from 'zss/firmware'
import { doasync } from 'zss/mapping/func'
import { ispresent } from 'zss/mapping/types'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { READ_CONTEXT, readargs, readargsuntilend } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

function chatusagebridge() {
  return (
    'usage: chat <twitch-channel> | chat start <kind> … | chat stop <kind> | chat profile … ' +
    '(kinds: twitch, rss, mastodon, bluesky). ' +
    'Start with @profilename to load a saved profile; add key=value to override. ' +
    'RSS/feeds use browser fetch—URLs must allow CORS.'
  )
}

function chatusageprofile() {
  return (
    'usage: chat profile (lists) | chat profile list | chat profile show <name> | chat profile delete <name> | ' +
    'chat profile save <name> <kind> … (same fields as chat start <kind> …)'
  )
}

export function registermultiplayercommands(fw: FIRMWARE): FIRMWARE {
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
      [ARG_TYPE.MAYBE_NAME, 'chat bridge: twitch / feeds (operator only)'],
      (_, words) => {
        const player = READ_CONTEXT.elementfocus
        const [inputs] = readargsuntilend(words, 0, ARG_TYPE.NAME)
        const kind = normalizechatkind(inputs[1] ?? '')
        switch (NAME(inputs[0])) {
          case 'START': {
            if (!kind) {
              apierror(
                SOFTWARE,
                player,
                'bridge',
                'chat start needs kind: twitch, rss, mastodon, bluesky',
              )
              return 0
            }
            bridgechatstart(SOFTWARE, player, kind)
            return 0
          }
          case 'STOP': {
            if (!kind) {
              apierror(
                SOFTWARE,
                player,
                'bridge',
                'chat start needs kind: twitch, rss, mastodon, bluesky',
              )
              return 0
            }
            bridgechatstop(SOFTWARE, player, kind)
            return 0
          }
          case '': // show menu
            bridgechatlist(SOFTWARE, player)
            apilog(SOFTWARE, player, chatusagebridge())
            return 0
          default:
            bridgechatstart(SOFTWARE, player, inputs[0])
            return 0
        }
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
