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

function shortplayerid(player: string): string {
  if (player.length <= 10) {
    return player
  }
  return `${player.slice(0, 7)}...`
}

/** Terminal #media menu (queue table + admin action links). */
export function showmediamenu(player: string, canmanage: boolean) {
  const state = mediaqueuereadstate()
  const rows: string[] = [...zssheaderlines('MEDIA')]

  const queuerows: string[][] = []
  if (state.urls.length === 0) {
    rows.push(zsstextline('queue: (empty)'))
  } else {
    for (let i = 0; i < state.urls.length; ++i) {
      const url = state.urls[i]
      const who = state.players[i] ? shortplayerid(state.players[i]) : '?'
      const mark = i === state.index ? '>' : ' '
      const short = url.length > 44 ? `${url.slice(0, 41)}...` : url
      queuerows.push([mark, String(i), who, short])
    }
    rows.push('$white  queue')
    rows.push(...zsstexttablelines(queuerows, ['', 'index', 'who', 'url']))
  }

  if (canmanage) {
    rows.push('$32')
    rows.push(zsszedlinkline('media skip', '$cyanSkip'))
    rows.push(zsszedlinkline('media clear', '$redClear queue'))
    rows.push(zsszedlinkline('media stop', '$redStop helper'))
  }

  terminalwritelines(SOFTWARE, player, zsstexttape(...rows))
}
