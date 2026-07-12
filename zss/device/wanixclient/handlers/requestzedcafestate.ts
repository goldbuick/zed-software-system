import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { wanixserverrequestzedcafestate } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { SOFTWARE } from 'zss/device/session'
import { memoryreadoperator } from 'zss/memory/session'

export function handlerequestzedcafestate(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    const { exportfilestoguestfiles, readhostexportfilesasync } =
      await import('zss/device/wanixclient/wanixzedcafe')
    const files = await readhostexportfilesasync(SOFTWARE, memoryreadoperator())
    wanixserverrequestzedcafestate(
      device,
      message.player,
      exportfilestoguestfiles(files),
    )
  })
}
