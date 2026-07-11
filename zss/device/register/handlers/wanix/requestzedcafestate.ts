import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { SOFTWARE } from 'zss/device/session'
import { memoryreadoperator } from 'zss/memory/session'

export function handlerequestzedcafestate(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    try {
      const { exportfilestoguestfiles, readhostexportfilesasync } =
        await import('zss/device/register/handlers/wanix/wanixzedcafe')
      const files = await readhostexportfilesasync(
        SOFTWARE,
        memoryreadoperator(),
      )
      device.reply(
        message,
        'wanix:requestzedcafestate',
        exportfilestoguestfiles(files),
      )
    } catch (err) {
      device.reply(message, 'wanix:requestzedcafestate', {
        __wanixerror: err instanceof Error ? err.message : String(err),
      })
    }
  })
}
