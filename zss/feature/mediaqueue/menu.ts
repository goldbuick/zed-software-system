import { vmgadgetscroll } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  MEDIA_SCROLL_CHIP,
  MEDIA_SCROLL_NAME,
  MEDIA_URL_TARGET,
} from 'zss/feature/mediaqueue/constants'
import {
  mediaqueuehasactivestream,
  mediaqueuehelperconnected,
  mediaqueueislistenhost,
  mediaqueueislistening,
  mediaqueuereadboundboardid,
  mediaqueuereadboundboardlabel,
  mediaqueuereadpeerid,
} from 'zss/feature/mediaqueue/listenstate'
import { mediaqueuereadstate } from 'zss/feature/mediaqueue/queue'
import 'zss/feature/mediaqueue/urlfield'
import {
  zssheaderlines,
  zsstextline,
  zsstexttape,
  zsszedlinkline,
} from 'zss/feature/zsstextui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'

function boardlabel(boardid: string): string {
  if (!boardid) {
    return '?'
  }
  return mediaqueuereadboundboardlabel(boardid)
}

function statushint(player: string): string {
  const helperup = mediaqueuehelperconnected()
  const streamup = mediaqueuehasactivestream()
  const state = mediaqueuereadstate()
  const ishost = mediaqueueislistenhost(player)

  if (!mediaqueueislistening()) {
    if (mediaqueuehasactivestream() && !ishost) {
      return 'receiving board TV -- host controls queue'
    }
    return '#media <peerid> to bind Media Queue helper'
  }
  if (!helperup) {
    return 'waiting for Media Queue app'
  }
  if (!streamup && state.urls.length === 0) {
    return 'helper up -- add a url'
  }
  if (!streamup) {
    return 'helper up -- pick queue row or Next'
  }
  return 'playing on board TV'
}

function statustag(): string {
  const peerid = mediaqueuereadpeerid()
  const boundid = mediaqueuereadboundboardid()
  const helperup = mediaqueuehelperconnected()
  const streamup = mediaqueuehasactivestream()
  if (!peerid && !boundid) {
    return 'not bound'
  }
  const parts: string[] = []
  if (boundid) {
    parts.push(boardlabel(boundid))
  }
  if (peerid) {
    parts.push(`helper ${peerid}`)
  }
  if (helperup) {
    parts.push('up')
  }
  if (streamup) {
    parts.push('playing')
  }
  return parts.join(' / ')
}

/** Build #media scroll tape from live queue + listen state (main-thread helpers). */
export function mediascrollcontent(player: string): string {
  const state = mediaqueuereadstate()
  const peerid = mediaqueuereadpeerid()
  const ishost = mediaqueueislistenhost(player)
  const rows: string[] = [
    ...zssheaderlines('MEDIA'),
    zsstextline(statustag()),
    zsstextline(statushint(player)),
  ]

  if (!mediaqueueislistening() || !ishost) {
    rows.push(zsstextline('#media <peerid> binds helper on this board'))
  }

  if (state.urls.length === 0) {
    rows.push(zsstextline('queue: (empty)'))
  } else {
    for (let i = 0; i < state.urls.length; ++i) {
      const url = state.urls[i]
      const mark = i === state.index ? '>' : ' '
      const short = url.length > 48 ? `${url.slice(0, 45)}...` : url
      rows.push(
        zsszedlinkline(`goto hyperlink next ${i}`, `${mark}[${i}] ${short}`),
      )
    }
  }

  if (ishost || !mediaqueueislistening()) {
    rows.push(zsszedlinkline(`${MEDIA_URL_TARGET} text`, 'url'))
    rows.push(zsszedlinkline('addurl hyperlink next', '$greenAdd'))
  }

  if (ishost && state.urls.length > 0) {
    rows.push(zsszedlinkline('next hyperlink next', '$cyanNext'))
    rows.push(zsszedlinkline('clear hyperlink next', '$redClear'))
  }
  if (ishost && peerid) {
    rows.push(zsszedlinkline('stop hyperlink', '$redStop'))
  }
  rows.push(zsszedlinkline('refresh hyperlink next', '$grayRefresh'))

  return zsstexttape(...rows).trim()
}

/** Open #media scroll on the VM gadget state (sim worker). */
export function showmediascroll(player: string) {
  scrollwritelines(
    player,
    MEDIA_SCROLL_NAME,
    mediascrollcontent(player),
    MEDIA_SCROLL_CHIP,
  )
}

/** Push #media scroll from MAIN after helper/queue mutations (gadget state lives on VM). */
export function publishmediascroll(player: string) {
  vmgadgetscroll(SOFTWARE, player, {
    scrollname: MEDIA_SCROLL_NAME,
    content: mediascrollcontent(player),
    chip: MEDIA_SCROLL_CHIP,
  })
}
