import { DEVICELIKE, apierror } from 'zss/device/api'

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
