import { SOFTWARE } from 'zss/device/session'
import { mediaqueuereadstate } from 'zss/feature/mediaqueue/queue'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  zssheaderlines,
  zsstextline,
  zsstexttablelines,
  zsstexttape,
  zsszedlinkline,
} from 'zss/feature/zsstextui'

/** Terminal #media menu (queue table + copy URLs). */
export function showmediamenu(player: string, helperpeerid: string) {
  const state = mediaqueuereadstate(helperpeerid)
  const rows: string[] = [...zssheaderlines('MEDIA')]

  const queuerows: string[][] = []
  if (state.urls.length === 0) {
    rows.push(zsstextline('queue: (empty)'))
  } else {
    for (let i = 0; i < state.urls.length; ++i) {
      const url = state.urls[i]
      const who = state.names[i]
      const color = i === state.index ? '$yellow' : '$white'
      const short = url.length > 44 ? `${url.slice(0, 41)}...` : url
      queuerows.push([`${color}${who}`, `${color}${short}`])
    }
    rows.push('$white  queue')
    rows.push(...zsstexttablelines(queuerows, ['who', 'url']))
  }

  rows.push('$32')
  rows.push(zsszedlinkline('media playlist', 'Copy URLs'))

  terminalwritelines(SOFTWARE, player, zsstexttape(...rows))
}
