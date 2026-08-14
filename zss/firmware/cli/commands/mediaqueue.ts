import { apierror, apilog } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  mediaqueueadd,
  mediaqueueclear,
  mediaqueuecurrenturl,
  mediaqueuenext,
  mediaqueuereadstate,
  mediaqueuesetindex,
} from 'zss/feature/mediaqueue/queue'
import {
  mediaqueuefanoutroom,
  mediaqueueislistening,
  mediaqueuelisten,
  mediaqueuepushqueuesnapshot,
  mediaqueuereadpeerid,
  mediaqueuerequesthelpercall,
  mediaqueuestop,
} from 'zss/feature/mediaqueue/receive'
import { FIRMWARE } from 'zss/firmware'
import { MEDIAQUEUE_HEAD_KEYWORDS } from 'zss/firmware/autocompleteconstants'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

function mediaqueueusage() {
  return (
    'usage: mediaqueue listen | peer | add <url> | list | goto <index> | next | clear | call | stop'
  )
}

function logqueuestate(player: string) {
  const state = mediaqueuereadstate()
  if (state.urls.length === 0) {
    apilog(SOFTWARE, player, 'mediaqueue: (empty)')
    return
  }
  for (let i = 0; i < state.urls.length; ++i) {
    const mark = i === state.index ? '>' : ' '
    apilog(SOFTWARE, player, `${mark} [${i}] ${state.urls[i]}`)
  }
}

export function registermediaqueuecommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'mediaqueue',
    [ARG_TYPE.MAYBE_NAME, 'PeerJS media queue $26 board TV (operator)'],
    (_, words) => {
      const player = READ_CONTEXT.elementfocus
      const [head] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      const action = NAME(head ?? '')

      if (!action || action === 'help') {
        apierror(SOFTWARE, player, 'mediaqueue', mediaqueueusage())
        return 0
      }

      if (action === 'listen' || action === 'start') {
        mediaqueuelisten(player)
        return 0
      }

      if (action === 'peer' || action === 'id') {
        const id = mediaqueuereadpeerid()
        if (!id) {
          apierror(
            SOFTWARE,
            player,
            'mediaqueue',
            'not listening -- run #mediaqueue listen',
          )
          return 0
        }
        apilog(SOFTWARE, player, `mediaqueue peer ${id}`)
        return 0
      }

      if (action === 'stop') {
        mediaqueuestop(player)
        return 0
      }

      if (action === 'clear') {
        mediaqueueclear()
        mediaqueuepushqueuesnapshot()
        apilog(SOFTWARE, player, 'mediaqueue cleared')
        return 0
      }

      if (action === 'list') {
        logqueuestate(player)
        return 0
      }

      if (action === 'next') {
        const state = mediaqueuenext()
        mediaqueuepushqueuesnapshot()
        const url = mediaqueuecurrenturl()
        apilog(
          SOFTWARE,
          player,
          url
            ? `mediaqueue next [${state.index}] ${url}`
            : 'mediaqueue: (empty)',
        )
        return 0
      }

      if (action === 'goto') {
        const [indexraw] = readargs(words, 1, [ARG_TYPE.NUMBER])
        const state = mediaqueuesetindex(Number(indexraw) || 0)
        mediaqueuepushqueuesnapshot()
        const url = mediaqueuecurrenturl()
        apilog(
          SOFTWARE,
          player,
          url
            ? `mediaqueue goto [${state.index}] ${url}`
            : 'mediaqueue: (empty)',
        )
        return 0
      }

      if (action === 'add') {
        const rest = words
          .slice(1)
          .map((w) => String(w))
          .join(' ')
          .trim()
        if (!rest) {
          apierror(
            SOFTWARE,
            player,
            'mediaqueue',
            'usage: mediaqueue add <url>',
          )
          return 0
        }
        const state = mediaqueueadd(rest)
        mediaqueuepushqueuesnapshot()
        apilog(
          SOFTWARE,
          player,
          `mediaqueue added [${state.urls.length - 1}] ${rest}`,
        )
        if (!mediaqueueislistening()) {
          apilog(
            SOFTWARE,
            player,
            'tip: run #mediaqueue listen so the helper can connect',
          )
        }
        return 0
      }

      if (action === 'call') {
        if (!mediaqueueislistening()) {
          apierror(
            SOFTWARE,
            player,
            'mediaqueue',
            'not listening -- run #mediaqueue listen',
          )
          return 0
        }
        mediaqueuerequesthelpercall()
        mediaqueuefanoutroom()
        apilog(SOFTWARE, player, 'mediaqueue requested helper MediaConnection')
        return 0
      }

      apierror(SOFTWARE, player, 'mediaqueue', mediaqueueusage())
      return 0
    },
    {
      byposition: [[...MEDIAQUEUE_HEAD_KEYWORDS]],
      whenfirst: {
        add: [[], []],
        goto: [[], []],
      },
    },
  )
}
