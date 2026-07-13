import { apierror } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/messagetypes'
export function doasync(
  device: DEVICELIKE,
  player: string,
  asyncfunc: () => Promise<void>,
) {
  asyncfunc().catch((error) => {
    console.error(error)
    apierror(device, player, 'crash', error?.message)
  })
}
