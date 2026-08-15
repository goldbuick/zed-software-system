import type { DEVICE } from 'zss/device'
import { apierror, apilog } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { SOFTWARE } from 'zss/device/session'
import type { MESSAGE } from 'zss/device/types'
import 'zss/feature/mediaqueue/urlfield'
import { showmediascroll } from 'zss/feature/mediaqueue/menu'
import {
  mediaqueueadd,
  mediaqueueclear,
  mediaqueuenext,
  mediaqueuesetindex,
} from 'zss/feature/mediaqueue/queue'
import {
  mediaqueuepushqueuesnapshot,
  mediaqueuelisten,
  mediaqueuestop,
} from 'zss/feature/mediaqueue/receive'
import {
  mediaqueuecleardraftpeerid,
  mediaqueuecleardrafturl,
  mediaqueuereaddraftpeerid,
  mediaqueuereaddrafturl,
} from 'zss/feature/mediaqueue/urlfield'
import { netterminalhost } from 'zss/feature/netterminal'
import { isarray, isstring } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

function readstringarg(message: MESSAGE): string | undefined {
  if (isarray(message.data)) {
    const first = (message.data as unknown[])[0]
    if (isstring(first)) {
      return first
    }
  } else if (isstring(message.data)) {
    return message.data
  }
  return undefined
}

/** Scroll chip actions for #media (MAIN thread via bridge:mediapanel). */
export function handlemediapanel(
  vm: DEVICE,
  message: MESSAGE,
  path: string,
): void {
  const player = message.player
  void vm
  switch (NAME(path)) {
    case 'start': {
      const peerid = mediaqueuereaddraftpeerid()
      if (!peerid) {
        apierror(SOFTWARE, player, 'media', 'enter the helper peer id first')
        return
      }
      const payload = message.data as
        | { boardid?: unknown; boardname?: unknown }
        | undefined
      const boardid = isstring(payload?.boardid) ? payload.boardid.trim() : ''
      const boardname = isstring(payload?.boardname)
        ? payload.boardname.trim()
        : ''
      doasync(SOFTWARE, player, async () => {
        await netterminalhost()
        mediaqueuelisten(player, peerid, boardid, boardname)
        mediaqueuecleardraftpeerid()
        showmediascroll(player)
      })
      break
    }
    case 'addurl': {
      const url = mediaqueuereaddrafturl()
      if (!url) {
        apierror(SOFTWARE, player, 'media', 'enter a url first')
        return
      }
      mediaqueueadd(url)
      mediaqueuepushqueuesnapshot()
      mediaqueuecleardrafturl()
      showmediascroll(player)
      break
    }
    case 'goto': {
      const raw = readstringarg(message)
      const index = Number(raw)
      if (!Number.isFinite(index)) {
        apierror(SOFTWARE, player, 'media', 'goto needs an index')
        return
      }
      mediaqueuesetindex(index)
      mediaqueuepushqueuesnapshot()
      showmediascroll(player)
      break
    }
    case 'next':
      mediaqueuenext()
      mediaqueuepushqueuesnapshot()
      showmediascroll(player)
      break
    case 'clear':
      mediaqueueclear()
      mediaqueuepushqueuesnapshot()
      showmediascroll(player)
      break
    case 'stop':
      mediaqueuestop(player)
      showmediascroll(player)
      break
    case 'refresh':
      showmediascroll(player)
      apilog(SOFTWARE, player, 'media scroll refreshed')
      break
    default:
      break
  }
}
