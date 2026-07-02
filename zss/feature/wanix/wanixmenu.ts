import { SOFTWARE } from 'zss/device/session'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  zssheaderlines,
  zsssectionlines,
  zsstextline,
  zsstexttape,
  zsszedlinkline,
} from 'zss/feature/zsstextui'

export function showwanixmenu(player: string) {
  terminalwritelines(
    SOFTWARE,
    player,
    zsstexttape(
      ...zssheaderlines('WANIX'),
      zsstextline('drop a .wasm or .tgz to run'),
      ...zsssectionlines('Tasks'),
      zsstextline('$grayno tasks running'),
      ...zsssectionlines('VMs'),
      zsszedlinkline('wanix vm', 'Boot Linux in v86'),
      zsszedlinkline('wanix vm stop', 'Stop Linux VM'),
      ...zsssectionlines('Control'),
      zsszedlinkline('wanix attach', 'Attach terminal'),
      zsszedlinkline('wanix detach', 'Detach terminal'),
      zsszedlinkline('wanix stop', 'Stop all'),
      ...zsssectionlines('Remote'),
      zsszedlinkline('wanix remote', 'Remote imports (WSS 9P)'),
      zsstextline(
        '$gray#wanix bridge <ws-url> — export namespace (not wired yet)',
      ),
    ),
  )
}
