import {
  apierror,
  bridgechatstart,
  bridgechatstop,
  bridgestart,
  bridgestatus,
  bridgestreamstart,
  bridgestreamstop,
  bridgetab,
  vmadmin,
} from 'zss/device/api'
import { CHAT_KIND, normalizechatkind } from 'zss/device/bridge/chattypes'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

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
      [ARG_TYPE.MAYBE_NAME, 'chat bridge: twitch / irc / xmpp (operator only)'],
      (_, words) => {
        const w = words.map((x) => String(x))
        if (w.length === 0 || !w[0]?.trim()) {
          apierror(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'bridge',
            'usage: chat <twitch-channel> | chat start <kind> … | chat stop <kind>',
          )
          return 0
        }
        const head = NAME(w[0])
        if (head === 'START') {
          const kind = normalizechatkind(w[1] ?? '')
          if (!kind) {
            apierror(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              'bridge',
              'chat start needs kind: twitch, irc, or xmpp',
            )
            return 0
          }
          let i = 2
          if (kind === CHAT_KIND.TWITCH) {
            const ch = w[i++]?.trim()
            if (!ch) {
              apierror(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                'bridge',
                'chat start twitch <channel> [routekey]',
              )
              return 0
            }
            const rk = w[i]?.trim()
            if (rk) {
              bridgechatstart(SOFTWARE, READ_CONTEXT.elementfocus, {
                kind: CHAT_KIND.TWITCH,
                routekey: rk,
                channel: ch,
              })
            } else {
              bridgechatstart(SOFTWARE, READ_CONTEXT.elementfocus, ch)
            }
            return 0
          }
          if (kind === CHAT_KIND.IRC) {
            const routekey = w[i++]?.trim()
            const websocketurl = w[i++]?.trim()
            const channel = w[i++]?.trim()
            const nick = w[i++]?.trim()
            const password = w[i]?.trim()
            if (!routekey || !websocketurl || !channel || !nick) {
              apierror(
                SOFTWARE,
                READ_CONTEXT.elementfocus,
                'bridge',
                'chat start irc <routekey> <websocketurl> <channel> <nick> [password]',
              )
              return 0
            }
            bridgechatstart(SOFTWARE, READ_CONTEXT.elementfocus, {
              kind: CHAT_KIND.IRC,
              routekey,
              websocketurl,
              channel,
              nick,
              ...(password ? { password } : {}),
            })
            return 0
          }
          const routekey = w[i++]?.trim()
          const service = w[i++]?.trim()
          const domain = w[i++]?.trim()
          const username = w[i++]?.trim()
          const password = w[i++]?.trim()
          const muc = w[i++]?.trim()
          const mucnick = w[i]?.trim()
          if (
            !routekey ||
            !service ||
            !domain ||
            !username ||
            !password ||
            !muc
          ) {
            apierror(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              'bridge',
              'chat start xmpp <routekey> <service> <domain> <username> <password> <muc> [mucnick]',
            )
            return 0
          }
          bridgechatstart(SOFTWARE, READ_CONTEXT.elementfocus, {
            kind: CHAT_KIND.XMPP,
            routekey,
            service,
            domain,
            username,
            password,
            muc,
            ...(mucnick ? { mucnick } : {}),
          })
          return 0
        }
        if (head === 'STOP') {
          const kind = normalizechatkind(w[1] ?? '')
          if (!kind) {
            apierror(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              'bridge',
              'chat stop needs kind: twitch, irc, or xmpp',
            )
            return 0
          }
          bridgechatstop(SOFTWARE, READ_CONTEXT.elementfocus, kind)
          return 0
        }
        bridgechatstart(SOFTWARE, READ_CONTEXT.elementfocus, w[0])
        return 0
      },
    )
    .command(
      'bridge',
      [ARG_TYPE.MAYBE_NAME, 'bridge integrations (operator only)'],
      (_, words) => {
        const [sub] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
        const s = sub ? NAME(String(sub)) : ''
        if (!s || s === 'STATUS') {
          bridgestatus(SOFTWARE, READ_CONTEXT.elementfocus)
        } else {
          apierror(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            'bridge',
            'unknown bridge command (try: bridge status)',
          )
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
