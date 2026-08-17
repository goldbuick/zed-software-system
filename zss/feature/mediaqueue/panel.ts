import type { DEVICE } from 'zss/device'
import { apierror } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { SOFTWARE } from 'zss/device/session'
import type { MESSAGE } from 'zss/device/types'
import { mediaqueueensurevideosink } from 'zss/feature/mediaqueue/attachvideo'
import {
  mediaqueueislistening,
  mediaqueuereadboundboardid,
} from 'zss/feature/mediaqueue/listenstate'
import {
  mediareadcanmanagefrompayload,
  mediareaddisplaynamefrompayload,
} from 'zss/feature/mediaqueue/mediaguards'
import { showmediamenu } from 'zss/feature/mediaqueue/mediamenu'
import { mediaqueuesyncnowplayingboard } from 'zss/feature/mediaqueue/nowplayinglabel'
import {
  mediaqueueadd,
  mediaqueueclear,
  mediaqueuereadperplayerlimit,
  mediaqueuereadstate,
  mediaqueuesetperplayerlimit,
  mediaqueueskip,
} from 'zss/feature/mediaqueue/queue'
import { showqueuemenu } from 'zss/feature/mediaqueue/queuemenu'
import {
  mediaqueuelisten,
  mediaqueuepushqueuesnapshot,
  mediaqueuestop,
} from 'zss/feature/mediaqueue/receive'
import { netterminalensurehostready } from 'zss/feature/netterminal'
import { write } from 'zss/feature/writeui'
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

function readurlfrompayload(message: MESSAGE): string {
  const payload = message.data as { url?: unknown } | undefined
  if (isstring(payload?.url)) {
    return payload.url.trim()
  }
  return readstringarg(message)?.trim() ?? ''
}

function readlimitfrompayload(message: MESSAGE): number | undefined {
  const payload = message.data as { limit?: unknown } | undefined
  if (payload?.limit !== undefined) {
    const limit = Number(payload.limit)
    if (Number.isFinite(limit)) {
      return limit
    }
  }
  const raw = readstringarg(message)
  const limit = Number(raw)
  return Number.isFinite(limit) ? limit : undefined
}

function readpeeridfrompayload(message: MESSAGE): string {
  const payload = message.data as { peerid?: unknown } | undefined
  if (isstring(payload?.peerid)) {
    return payload.peerid.trim()
  }
  return readstringarg(message)?.trim() ?? ''
}

function requiremanage(player: string, message: MESSAGE): boolean {
  if (mediareadcanmanagefrompayload(message.data)) {
    return true
  }
  apierror(SOFTWARE, player, 'queue', 'queue admin only')
  return false
}

function mediabind(
  player: string,
  peerid: string,
  boardid: string,
  boardname: string,
): void {
  const trimmed = peerid.trim()
  if (!trimmed) {
    apierror(SOFTWARE, player, 'queue', 'need a helper peer id')
    return
  }
  doasync(SOFTWARE, player, async () => {
    mediaqueueensurevideosink()
    const ready = await netterminalensurehostready()
    if (!ready) {
      apierror(SOFTWARE, player, 'queue', 'could not start netterminal peer')
      return
    }
    mediaqueuelisten(player, trimmed, boardid, boardname)
    showqueuemenu(player)
  })
}

/** CLI actions for #media (MAIN thread via bridge:mediapanel). */
export function handlemediapanel(
  vm: DEVICE,
  message: MESSAGE,
  path: string,
): void {
  const player = message.player
  void vm
  switch (NAME(path)) {
    case 'menu':
      showmediamenu(player)
      break
    case 'add': {
      const url = readurlfrompayload(message)
      if (!url) {
        apierror(SOFTWARE, player, 'media', 'usage: #media <url>')
        return
      }
      if (!mediaqueueislistening()) {
        apierror(SOFTWARE, player, 'media', 'use #queue <peerid> first')
        return
      }
      const displayname = mediareaddisplaynamefrompayload(message.data)
      if (!displayname) {
        apierror(SOFTWARE, player, 'media', 'submitter name missing')
        return
      }
      const hadqueue = mediaqueuereadstate().urls.length > 0
      const result = mediaqueueadd(player, displayname, url)
      if (!result.ok) {
        if (result.reason === 'duplicate') {
          apierror(SOFTWARE, player, 'media', 'URL already in queue')
        } else if (result.reason === 'limit') {
          apierror(
            SOFTWARE,
            player,
            'media',
            `queue limit (${mediaqueuereadperplayerlimit()} per player)`,
          )
        } else {
          apierror(SOFTWARE, player, 'media', 'usage: #media <url>')
        }
        return
      }
      mediaqueuepushqueuesnapshot(!hadqueue)
      write(SOFTWARE, player, `media added: ${url}`)
      break
    }
    default:
      break
  }
}

/** CLI actions for #queue (MAIN thread via bridge:queuepanel). */
export function handlequeuepanel(
  vm: DEVICE,
  message: MESSAGE,
  path: string,
): void {
  const player = message.player
  void vm
  switch (NAME(path)) {
    case 'menu': {
      if (!requiremanage(player, message)) {
        return
      }
      showqueuemenu(player)
      break
    }
    case 'bind': {
      if (!requiremanage(player, message)) {
        return
      }
      const payload = message.data as
        | { peerid?: unknown; boardid?: unknown; boardname?: unknown }
        | undefined
      const peerid = isstring(payload?.peerid)
        ? payload.peerid.trim()
        : readpeeridfrompayload(message)
      const boardid = isstring(payload?.boardid) ? payload.boardid.trim() : ''
      const boardname = isstring(payload?.boardname)
        ? payload.boardname.trim()
        : ''
      mediabind(player, peerid, boardid, boardname)
      break
    }
    case 'skip': {
      if (!requiremanage(player, message)) {
        return
      }
      mediaqueueskip()
      mediaqueuepushqueuesnapshot(true)
      write(SOFTWARE, player, 'queue skipped to next')
      break
    }
    case 'limit': {
      if (!requiremanage(player, message)) {
        return
      }
      const limit = readlimitfrompayload(message)
      if (limit === undefined) {
        apierror(SOFTWARE, player, 'queue', 'usage: #queue limit <N>')
        return
      }
      mediaqueuesetperplayerlimit(limit)
      write(
        SOFTWARE,
        player,
        `queue limit: ${mediaqueuereadperplayerlimit()} per player`,
      )
      break
    }
    case 'clear': {
      if (!requiremanage(player, message)) {
        return
      }
      mediaqueueclear()
      mediaqueuepushqueuesnapshot()
      const boundboard = mediaqueuereadboundboardid()
      if (boundboard) {
        mediaqueuesyncnowplayingboard(player, boundboard, undefined)
      }
      write(SOFTWARE, player, 'queue cleared')
      break
    }
    case 'stop': {
      if (!requiremanage(player, message)) {
        return
      }
      mediaqueuestop(player)
      write(SOFTWARE, player, 'queue stopped')
      break
    }
    default:
      break
  }
}
