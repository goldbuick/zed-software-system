import type { DEVICE } from 'zss/device'
import { wanixserverrequestzedcafestate } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import type { MESSAGE } from 'zss/device/types'
import { memoryreadoperator } from 'zss/memory/session'

export function handlerequestzedcafestate(
  device: DEVICE,
  message: MESSAGE,
): void {
  const player = message.player || registerreadplayer() || memoryreadoperator()
  doasync(device, player, async () => {
    const {
      armzedcafepollfromhostfiles,
      exportfilestoguestfiles,
      readhostexportfilesasync,
    } = await import('zss/device/wanixclient/wanixzedcafe')
    const files = await readhostexportfilesasync(SOFTWARE, player)
    // Drop-pull syncs inside the iframe and never runs parent pushzedcafesync —
    // arm import poll here so guest writebacks are not skipped (active=false).
    armzedcafepollfromhostfiles(device, player, files)
    wanixserverrequestzedcafestate(
      device,
      player,
      exportfilestoguestfiles(files),
    )
  })
}
