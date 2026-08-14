import {
  apierror,
  apilog,
  bridgebrowser,
  bridgemediastart,
  bridgemediastop,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  BROWSER_CONTROL_ORIGIN,
  BROWSER_WHEP_ENDPOINT,
  listwhependpointaliases,
  resolvewhependpoint,
} from 'zss/feature/broadcast/mediainputaliases'
import { FIRMWARE } from 'zss/firmware'
import {
  BROWSER_HEAD_KEYWORDS,
  MEDIA_HEAD_KEYWORDS,
  MEDIA_WHEP_ALIASES,
} from 'zss/firmware/autocompleteconstants'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

function mediausage() {
  return `usage: media whep <url|${listwhependpointaliases().join('|')}> <bearer> | media stop`
}

function browserusage() {
  return (
    'usage: browser attach <bearer> | browser goto <url> | browser click <x> <y> | ' +
    'browser type <text> | browser back | browser status | browser watch [bearer]'
  )
}

function restwords(words: unknown[], start: number): string {
  return words
    .slice(start)
    .map((word) => String(word))
    .join(' ')
    .trim()
}

export function registermediacommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command(
      'media',
      [
        ARG_TYPE.MAYBE_NAME,
        'webrtc media input (whep), not outbound broadcast (operator only)',
      ],
      (_, words) => {
        const [first, endpoint, bearer] = readargs(words, 0, [
          ARG_TYPE.MAYBE_NAME,
          ARG_TYPE.MAYBE_NAME,
          ARG_TYPE.MAYBE_NAME,
        ])
        const player = READ_CONTEXT.elementfocus
        if (!first) {
          apierror(SOFTWARE, player, 'media', mediausage())
          return 0
        }
        if (NAME(String(first)) === 'stop') {
          bridgemediastop(SOFTWARE, player)
          return 0
        }
        if (NAME(String(first)) !== 'whep') {
          apierror(SOFTWARE, player, 'media', mediausage())
          return 0
        }
        if (!endpoint || !bearer) {
          apierror(SOFTWARE, player, 'media', mediausage())
          return 0
        }
        const resolved = resolvewhependpoint(String(endpoint))
        if (!resolved) {
          apierror(
            SOFTWARE,
            player,
            'media',
            `unknown whep endpoint; use a URL or alias: ${listwhependpointaliases().join(', ')}`,
          )
          return 0
        }
        bridgemediastart(SOFTWARE, player, {
          kind: 'whep',
          endpoint: resolved,
          bearer: String(bearer),
        })
        return 0
      },
      {
        byposition: [[...MEDIA_HEAD_KEYWORDS]],
        whenfirst: {
          whep: [[], [...MEDIA_WHEP_ALIASES]],
        },
      },
    )
    .command(
      'browser',
      [ARG_TYPE.MAYBE_NAME, 'remote headed browser control (operator only)'],
      (_, words) => {
        const [action] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
        const player = READ_CONTEXT.elementfocus
        const head = NAME(typeof action === 'string' ? action : '')
        if (!head) {
          apilog(
            SOFTWARE,
            player,
            `headed browser sidecar at ${BROWSER_CONTROL_ORIGIN} -- ${browserusage()}`,
          )
          return 0
        }
        if (head === 'attach') {
          const bearer = restwords(words, 1)
          if (!bearer) {
            apierror(
              SOFTWARE,
              player,
              'media',
              'usage: browser attach <bearer>',
            )
            return 0
          }
          bridgebrowser(SOFTWARE, player, { action: 'attach', bearer })
          return 0
        }
        if (head === 'watch') {
          const bearer = restwords(words, 1)
          const start: Record<string, unknown> = {
            kind: 'whep',
            endpoint: BROWSER_WHEP_ENDPOINT,
          }
          if (bearer) {
            start.bearer = bearer
          }
          bridgemediastart(SOFTWARE, player, start)
          return 0
        }
        if (head === 'goto') {
          const url = restwords(words, 1)
          if (!url) {
            apierror(SOFTWARE, player, 'media', 'usage: browser goto <url>')
            return 0
          }
          bridgebrowser(SOFTWARE, player, { action: 'goto', url })
          return 0
        }
        if (head === 'click') {
          const [x, y] = readargs(words, 1, [
            ARG_TYPE.MAYBE_NUMBER,
            ARG_TYPE.MAYBE_NUMBER,
          ])
          if (typeof x !== 'number' || typeof y !== 'number') {
            apierror(SOFTWARE, player, 'media', 'usage: browser click <x> <y>')
            return 0
          }
          bridgebrowser(SOFTWARE, player, { action: 'click', x, y })
          return 0
        }
        if (head === 'type') {
          const text = restwords(words, 1)
          bridgebrowser(SOFTWARE, player, { action: 'type', text })
          return 0
        }
        if (head === 'back') {
          bridgebrowser(SOFTWARE, player, { action: 'back' })
          return 0
        }
        if (head === 'status') {
          bridgebrowser(SOFTWARE, player, { action: 'status' })
          return 0
        }
        apierror(SOFTWARE, player, 'media', browserusage())
        return 0
      },
      { byposition: [[...BROWSER_HEAD_KEYWORDS]] },
    )
}
