import { SOFTWARE } from 'zss/device/session'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { buildwanixmenutape } from 'zss/feature/wanix/wanixmenutape'
import { readwanixmenustate } from 'zss/feature/wanix/wanixroom'

export {
  buildwanixmenutape,
  readwanixheadertitle,
  readwanixtasklabel,
  readwanixvmstatusline,
} from 'zss/feature/wanix/wanixmenutape'

export async function showwanixmenu(player: string): Promise<void> {
  const state = await readwanixmenustate()
  terminalwritelines(SOFTWARE, player, buildwanixmenutape(state))
}
