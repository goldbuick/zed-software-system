import { SOFTWARE } from 'zss/device/session'
import { mediaqueuereadstate } from 'zss/feature/mediaqueue/queue'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  zssheaderlines,
  zsstextline,
  zsstexttablelines,
  zsstexttape,
} from 'zss/feature/zsstextui'

/** Terminal #media menu (queue table only). */
export function showmediamenu(player: string) {
  const state = mediaqueuereadstate()
  const rows: string[] = [...zssheaderlines('MEDIA')]

  const queuerows: string[][] = []
  if (state.urls.length === 0) {
    rows.push(zsstextline('queue: (empty)'))
  } else {
    for (let i = 0; i < state.urls.length; ++i) {
      const url = state.urls[i]
      // Names are resolved on the VM at submit time; this menu renders on the
      // bridge, where player flags are not available.
      const who = state.names[i]
      const mark = i === state.index ? '>' : ' '
      const short = url.length > 44 ? `${url.slice(0, 41)}...` : url
      queuerows.push([mark, String(i), who, short])
    }
    rows.push('$white  queue')
    rows.push(...zsstexttablelines(queuerows, ['', 'index', 'who', 'url']))
  }

  terminalwritelines(SOFTWARE, player, zsstexttape(...rows))
}
