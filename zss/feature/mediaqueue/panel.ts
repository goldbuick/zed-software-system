import type { DEVICE } from 'zss/device'
import { apierror, apilog } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { SOFTWARE } from 'zss/device/session'
import type { MESSAGE } from 'zss/device/types'
import 'zss/feature/mediaqueue/urlfield'
import { publishmediascroll } from 'zss/feature/mediaqueue/menu'
import { mediaqueueensurevideosink } from 'zss/feature/mediaqueue/attachvideo'
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
  mediaqueuecleardrafturl,
  mediaqueuereaddrafturl,
} from 'zss/feature/mediaqueue/urlfield'
import { netterminalensurehostready } from 'zss/feature/netterminal'
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

function mediabind(
  player: string,
  peerid: string,
  boardid: string,
  boardname: string,
): void {
  const trimmed = peerid.trim()
  if (!trimmed) {
    apierror(SOFTWARE, player, 'media', 'need a helper peer id')
    return
  }
  doasync(SOFTWARE, player, async () => {
    mediaqueueensurevideosink()
    const ready = await netterminalensurehostready()
    if (!ready) {
      apierror(SOFTWARE, player, 'media', 'could not start netterminal peer')
      return
    }
    mediaqueuelisten(player, trimmed, boardid, boardname)
    publishmediascroll(player)
  })
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
    case 'bind': {
      const payload = message.data as
        | { peerid?: unknown; boardid?: unknown; boardname?: unknown }
        | undefined
      const peerid = isstring(payload?.peerid) ? payload.peerid.trim() : ''
      const boardid = isstring(payload?.boardid) ? payload.boardid.trim() : ''
      const boardname = isstring(payload?.boardname)
        ? payload.boardname.trim()
        : ''
      mediabind(player, peerid, boardid, boardname)
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
      publishmediascroll(player)
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
      publishmediascroll(player)
      break
    }
    case 'next':
      mediaqueuenext()
      mediaqueuepushqueuesnapshot()
      publishmediascroll(player)
      break
    case 'clear':
      mediaqueueclear()
      mediaqueuepushqueuesnapshot()
      publishmediascroll(player)
      break
    case 'stop':
      mediaqueuestop(player)
      publishmediascroll(player)
      break
    case 'refresh':
      publishmediascroll(player)
      apilog(SOFTWARE, player, 'media scroll refreshed')
      break
    default:
      break
  }
}
