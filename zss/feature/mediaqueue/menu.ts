import {
  MEDIA_PEER_TARGET,
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
    return 'copy peer id from Media Queue app, paste below, Start'
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

/** Build and open the #media scroll (state-driven instructions + queue). */
export function showmediascroll(player: string) {
  const state = mediaqueuereadstate()
  const peerid = mediaqueuereadpeerid()
  const ishost = mediaqueueislistenhost(player)
  const rows: string[] = [
    ...zssheaderlines('MEDIA'),
    zsstextline(statustag()),
    zsstextline(statushint(player)),
  ]

  if (!mediaqueueislistening() || !ishost) {
    rows.push(zsszedlinkline(`${MEDIA_PEER_TARGET} text`, 'peer id'))
    rows.push(zsszedlinkline('start hyperlink next', '$greenStart'))
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

  scrollwritelines(
    player,
    MEDIA_SCROLL_NAME,
    zsstexttape(...rows).trim(),
    MEDIA_SCROLL_CHIP,
  )
}
