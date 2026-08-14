import {
  MEDIAQUEUE_SCROLL_CHIP,
  MEDIAQUEUE_SCROLL_NAME,
  MEDIAQUEUE_URL_TARGET,
} from 'zss/feature/mediaqueue/constants'
import {
  mediaqueuereadboundboardid,
  mediaqueuereadpeerid,
} from 'zss/feature/mediaqueue/receive'
import { mediaqueuereadstate } from 'zss/feature/mediaqueue/queue'
import 'zss/feature/mediaqueue/urlfield'
import {
  zssheaderlines,
  zsssectionlines,
  zsstextline,
  zsstexttape,
  zsszedlinkline,
} from 'zss/feature/zsstextui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'

/** Build and open the media-queue scroll (list + URL text field). */
export function showmediaqueuescroll(player: string) {
  const state = mediaqueuereadstate()
  const peerid = mediaqueuereadpeerid()
  const boardid = mediaqueuereadboundboardid()
  const rows: string[] = [
    ...zssheaderlines('MEDIA QUEUE'),
    zsstextline('board TV room -- PeerJS media from the local helper'),
  ]

  rows.push(...zsssectionlines('Status'))
  if (peerid) {
    rows.push(
      zsstextline(
        boardid
          ? `listening ${peerid} on board ${boardid}`
          : `listening ${peerid}`,
      ),
    )
  } else {
    rows.push(zsstextline('not listening -- #mediaqueue listen <peerid>'))
  }

  rows.push(...zsssectionlines('Queue'))
  if (state.urls.length === 0) {
    rows.push(zsstextline('(empty)'))
  } else {
    for (let i = 0; i < state.urls.length; ++i) {
      const url = state.urls[i]
      const mark = i === state.index ? '>' : ' '
      const short =
        url.length > 42 ? `${url.slice(0, 39)}...` : url
      rows.push(
        zsszedlinkline(
          `goto hyperlink next ${i}`,
          `${mark} [${i}] ${short}`,
        ),
      )
    }
  }

  rows.push(...zsssectionlines('Add URL'))
  rows.push(zsszedlinkline(`${MEDIAQUEUE_URL_TARGET} text`, 'url'))
  rows.push(zsszedlinkline('addurl hyperlink next', '$greenAdd to queue'))

  rows.push(...zsssectionlines('Control'))
  if (state.urls.length > 0) {
    rows.push(zsszedlinkline('next hyperlink next', '$cyanNext'))
    rows.push(zsszedlinkline('clear hyperlink next', '$redClear queue'))
  }
  if (peerid) {
    rows.push(zsszedlinkline('stop hyperlink', '$redStop listen'))
  }
  rows.push(zsszedlinkline('refresh hyperlink next', '$grayRefresh'))

  scrollwritelines(
    player,
    MEDIAQUEUE_SCROLL_NAME,
    zsstexttape(...rows).trim(),
    MEDIAQUEUE_SCROLL_CHIP,
  )
}
