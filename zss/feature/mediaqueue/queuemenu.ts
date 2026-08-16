import { SOFTWARE } from 'zss/device/session'
import { mediaqueuereadperplayerlimit } from 'zss/feature/mediaqueue/queue'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  zssheaderlines,
  zsstextline,
  zsstexttape,
  zsszedlinkline,
} from 'zss/feature/zsstextui'

/** Terminal #queue admin menu (control links + per-player limit). */
export function showqueuemenu(player: string) {
  const limit = mediaqueuereadperplayerlimit()
  const rows: string[] = [
    ...zssheaderlines('QUEUE'),
    zsstextline(`limit: ${limit} per player (use #queue limit <N>)`),
    '$32',
    zsszedlinkline('queue skip', 'Skip'),
    zsszedlinkline('queue clear', 'Clear queue'),
    zsszedlinkline('queue stop', 'Stop helper'),
  ]
  terminalwritelines(SOFTWARE, player, zsstexttape(...rows))
}
