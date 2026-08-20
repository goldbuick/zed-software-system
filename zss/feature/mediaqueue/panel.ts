import type { DEVICE } from 'zss/device'
import { apierror, apitoast, registercopy, workstatus } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { SOFTWARE } from 'zss/device/session'
import type { MESSAGE } from 'zss/device/types'
import { mediaqueueensurevideosink } from 'zss/feature/mediaqueue/attachvideo'
import {
  mediaqueueislistening,
  mediaqueuereadhelperpeerid,
} from 'zss/feature/mediaqueue/listenstate'
import {
  mediareadcanmanagefrompayload,
  mediareaddisplaynamefrompayload,
  mediareadhelperpeeridfrompayload,
} from 'zss/feature/mediaqueue/mediaguards'
import { showmediamenu } from 'zss/feature/mediaqueue/mediamenu'
import {
  mediaqueueclipitemsfromstate,
  mediaqueuecliplines,
} from 'zss/feature/mediaqueue/playlistcopy'
import { mediaqueuereadstate } from 'zss/feature/mediaqueue/queue'
import { showqueuemenu } from 'zss/feature/mediaqueue/queuemenu'
import {
  mediaqueuehelperdatalinkup,
  mediaqueuelisten,
  mediaqueuesendtohelper,
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

function readindexfrompayload(message: MESSAGE): number | undefined {
  const payload = message.data as { index?: unknown } | undefined
  if (payload?.index !== undefined) {
    const index = Number(payload.index)
    if (Number.isFinite(index)) {
      return Math.floor(index)
    }
  }
  const raw = readstringarg(message)
  const index = Number(raw)
  return Number.isFinite(index) ? Math.floor(index) : undefined
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

function requirehelper(player: string, noun: string): boolean {
  if (!mediaqueueislistening()) {
    apierror(SOFTWARE, player, noun, 'use #queue <peerid> first')
    return false
  }
  if (!mediaqueuehelperdatalinkup()) {
    apierror(SOFTWARE, player, noun, 'helper not connected')
    return false
  }
  return true
}

function requirepayloadhelper(player: string, message: MESSAGE): boolean {
  const helperpeerid = mediareadhelperpeeridfrompayload(message.data)
  if (!helperpeerid) {
    apierror(SOFTWARE, player, 'media', 'not on a board with media')
    return false
  }
  if (helperpeerid !== mediaqueuereadhelperpeerid()) {
    apierror(SOFTWARE, player, 'media', 'use #queue <peerid> first')
    return false
  }
  if (!mediaqueuehelperdatalinkup()) {
    apierror(SOFTWARE, player, 'media', 'helper not connected')
    return false
  }
  return true
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

/** CLI actions for #media (host MAIN thread via bridge:mediapanel). */
export function handlemediapanel(
  vm: DEVICE,
  message: MESSAGE,
  path: string,
): void {
  const player = message.player
  void vm
  switch (NAME(path)) {
    case 'menu':
      if (!requirepayloadhelper(player, message)) {
        return
      }
      showmediamenu(player)
      break
    case 'add': {
      const url = readurlfrompayload(message)
      if (!url) {
        apierror(SOFTWARE, player, 'media', 'usage: #media <url>')
        return
      }
      if (!requirepayloadhelper(player, message)) {
        return
      }
      const displayname = mediareaddisplaynamefrompayload(message.data)
      if (!displayname) {
        apierror(SOFTWARE, player, 'media', 'submitter name missing')
        return
      }
      const sent = mediaqueuesendtohelper({
        type: 'mediaqueue:add',
        url,
        player,
        name: displayname,
      })
      if (sent) {
        apitoast(SOFTWARE, player, `media requested: ${url}`)
        workstatus(SOFTWARE, player, 'media request')
      }
      break
    }
    case 'playlist': {
      if (!requirepayloadhelper(player, message)) {
        return
      }
      const items = mediaqueueclipitemsfromstate(mediaqueuereadstate())
      if (items.length === 0) {
        apierror(SOFTWARE, player, 'media', 'playlist empty')
        return
      }
      registercopy(SOFTWARE, player, mediaqueuecliplines(items))
      break
    }
    default:
      break
  }
}

/** CLI actions for #queue (host MAIN thread via bridge:queuepanel). */
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
      if (!requirehelper(player, 'queue')) {
        return
      }
      mediaqueuesendtohelper({ type: 'mediaqueue:skip' })
      break
    }
    case 'limit': {
      if (!requiremanage(player, message)) {
        return
      }
      if (!requirehelper(player, 'queue')) {
        return
      }
      const limit = readlimitfrompayload(message)
      if (limit === undefined) {
        apierror(SOFTWARE, player, 'queue', 'usage: #queue limit <N>')
        return
      }
      mediaqueuesendtohelper({ type: 'mediaqueue:setlimit', limit })
      break
    }
    case 'clear': {
      if (!requiremanage(player, message)) {
        return
      }
      if (!requirehelper(player, 'queue')) {
        return
      }
      mediaqueuesendtohelper({ type: 'mediaqueue:clear' })
      break
    }
    case 'approve':
    case 'reject': {
      if (!requiremanage(player, message)) {
        return
      }
      if (!requirehelper(player, 'queue')) {
        return
      }
      const index = readindexfrompayload(message)
      if (index === undefined) {
        apierror(SOFTWARE, player, 'queue', `usage: #queue ${NAME(path)} <N>`)
        return
      }
      mediaqueuesendtohelper({
        type:
          NAME(path) === 'approve' ? 'mediaqueue:approve' : 'mediaqueue:reject',
        index,
      })
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
