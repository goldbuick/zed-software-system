import { api_error, DEVICELIKE } from 'zss/device/api'

export function doasync(
  device: DEVICELIKE,
  player: string,
  asyncfunc: () => Promise<void>,
) {
  asyncfunc().catch((error) => {
    console.error(error)
    api_error(device, player, 'crash', error?.message)
  })
}
