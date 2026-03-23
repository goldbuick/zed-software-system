import {
  apierror,
  apilog,
  bridgechatstart,
  bridgechatstop,
  bridgestart,
  bridgestatus,
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
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

function chatusagebridge() {
  return (
    'usage: chat <twitch-channel> | chat start <kind> … | chat stop <kind> | chat profile … ' +
    '(kinds: twitch, irc, xmpp, rss, mastodon, bluesky). ' +
    'Start with @profilename to load a saved profile; add key=value to override. ' +
    'RSS/feeds use browser fetch—URLs must allow CORS. ' +
    'IRC example: wss://irc.example.com/ws (WebSocket gateway). ' +
    'XMPP service is often wss://host:5281/xmpp-websocket'
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
      [
        ARG_TYPE.MAYBE_NAME,
        'chat bridge: twitch / irc / xmpp / feeds (operator only)',
      ],
      (_, words) => {
        const w = words.map((x) => String(x))
        const player = READ_CONTEXT.elementfocus
        if (w.length === 0 || !w[0]?.trim()) {
          apierror(SOFTWARE, player, 'bridge', chatusagebridge())
          return 0
        }
        const head = NAME(w[0])
        if (head === 'PROFILE') {
          const sub = NAME(w[1] ?? '')
          const listprofiles = () => {
            doasync(SOFTWARE, player, async () => {
              const all = await bridgereadallprofiles()
              const names = Object.keys(all).sort()
              if (names.length === 0) {
                apilog(SOFTWARE, player, 'bridge profiles: (none)')
                return
              }
              apilog(SOFTWARE, player, `bridge profiles: ${names.join(', ')}`)
            })
          }
          if (sub === 'LIST' || !w[1]?.trim()) {
            listprofiles()
            return 0
          }
          if (sub === 'SHOW') {
            const name = w[2]?.trim()
            if (!name) {
              apierror(SOFTWARE, player, 'bridge', chatusageprofile())
              return 0
            }
            doasync(SOFTWARE, player, async () => {
              const p = await bridgereadprofile(name)
              if (!p) {
                apierror(SOFTWARE, player, 'bridge', `unknown profile ${name}`)
                return
              }
              const redacted = { ...p }
              if (redacted.password) {
                redacted.password = '***'
              }
              if (redacted.mastodontoken) {
                redacted.mastodontoken = '***'
              }
              if (redacted.blueskyapppassword) {
                redacted.blueskyapppassword = '***'
              }
              apilog(
                SOFTWARE,
                player,
                `profile ${name}: ${JSON.stringify(redacted)}`,
              )
            })
            return 0
          }
          if (sub === 'DELETE') {
            const name = w[2]?.trim()
            if (!name) {
              apierror(SOFTWARE, player, 'bridge', chatusageprofile())
              return 0
            }
            doasync(SOFTWARE, player, async () => {
              const ok = await bridgedeleteprofile(name)
              if (!ok) {
                apierror(SOFTWARE, player, 'bridge', `unknown profile ${name}`)
                return
              }
              apilog(SOFTWARE, player, `deleted bridge profile ${name}`)
            })
            return 0
          }
          if (sub === 'SAVE') {
            const name = w[2]?.trim()
            const kind = normalizechatkind(w[3] ?? '')
            if (!name || !kind) {
              apierror(SOFTWARE, player, 'bridge', chatusageprofile())
              return 0
            }
            const rest = w.slice(4)
            const built = buildchatstartforkind(kind, rest)
            if (!built) {
              apierror(
                SOFTWARE,
                player,
                'bridge',
                'could not parse profile fields (try key=value or positional args like chat start)',
              )
              return 0
            }
            doasync(SOFTWARE, player, async () => {
              await bridgewriteprofile(name, built)
              apilog(SOFTWARE, player, `saved bridge profile ${name} (${kind})`)
            })
            return 0
          }
          apierror(SOFTWARE, player, 'bridge', chatusageprofile())
          return 0
        }
        if (head === 'START') {
          const kind = normalizechatkind(w[1] ?? '')
          if (!kind) {
            apierror(
              SOFTWARE,
              player,
              'bridge',
              'chat start needs kind: twitch, irc, xmpp, rss, mastodon, bluesky',
            )
            return 0
          }
          const rest = w.slice(2)
          doasync(SOFTWARE, player, async () => {
            const profiles = await bridgereadallprofiles()
            const resolved = resolvechatstartwords(kind, rest, profiles)
            if (!resolved.ok) {
              apierror(SOFTWARE, player, 'bridge', resolved.reason)
              return
            }
            bridgechatstart(SOFTWARE, player, resolved.payload)
          })
          return 0
        }
        if (head === 'STOP') {
          const kind = normalizechatkind(w[1] ?? '')
          if (!kind) {
            apierror(
              SOFTWARE,
              player,
              'bridge',
              'chat stop needs kind: twitch, irc, xmpp, rss, mastodon, bluesky',
            )
            return 0
          }
          bridgechatstop(SOFTWARE, player, kind)
          return 0
        }
        bridgechatstart(SOFTWARE, player, w[0])
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
