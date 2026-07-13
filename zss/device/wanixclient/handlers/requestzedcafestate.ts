import type { DEVICE } from 'zss/device'
import { wanixserverrequestzedcafestate } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/types'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { memoryreadoperator } from 'zss/memory/session'

export function handlerequestzedcafestate(
  device: DEVICE,
  message: MESSAGE,
): void {
  const player = message.player || registerreadplayer() || memoryreadoperator()
  doasync(device, player, async () => {
    const { exportfilestoguestfiles, readhostexportfilesasync } =
      await import('zss/device/wanixclient/wanixzedcafe')
    const files = await readhostexportfilesasync(SOFTWARE, player)
    wanixserverrequestzedcafestate(
      device,
      player,
      exportfilestoguestfiles(files),
    )
  })
}
