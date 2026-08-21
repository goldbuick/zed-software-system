import { SOFTWARE } from 'zss/device/session'
import {
  mediaqueuereadperplayerlimit,
  mediaqueuereadstate,
} from 'zss/feature/mediaqueue/queue'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  zssheaderlines,
  zsstextline,
  zsstexttape,
  zsszedlinkline,
} from 'zss/feature/zsstextui'

function durationlabel(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) {
    return 'unknown'
  }
  const mins = Math.max(1, Math.round(sec / 60))
  return `${mins}m`
}

/** Terminal #queue admin menu (control links + per-player limit). */
export function showqueuemenu(player: string, helperpeerid: string) {
  const limit = mediaqueuereadperplayerlimit(helperpeerid)
  const state = mediaqueuereadstate(helperpeerid)
  const rows: string[] = [
    ...zssheaderlines('QUEUE'),
    zsstextline(`limit: ${limit} per player (use #queue limit <N>)`),
    '$32',
    zsszedlinkline('queue skip', 'Skip'),
    zsszedlinkline('queue clear', 'Clear queue'),
    zsszedlinkline('queue stop', 'Unbind this board'),
  ]
  if (state.pendingurls.length > 0) {
    rows.push('$32')
    rows.push(zsstextline('needs approval'))
    for (let i = 0; i < state.pendingurls.length; ++i) {
      const who = state.pendingnames[i] || '?'
      const title = state.pendingtitles[i] || state.pendingurls[i]
      const short = title.length > 28 ? `${title.slice(0, 25)}...` : title
      const dur = durationlabel(state.pendingdurations[i])
      rows.push(
        zsszedlinkline(`queue approve ${i}`, `Approve ${dur} ${who} ${short}`),
      )
      rows.push(zsszedlinkline(`queue reject ${i}`, 'Reject'))
    }
  }
  terminalwritelines(SOFTWARE, player, zsstexttape(...rows))
}
