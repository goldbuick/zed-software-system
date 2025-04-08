import { api_error, DEVICELIKE } from 'zss/device/api'

export function doasync(
  device: DEVICELIKE,
  player: string,
  asyncfunc: () => Promise<void>,
) {
  function logerror(error: Error) {
    api_error(device, player, 'crash', error.message)
  }
  asyncfunc().catch(logerror)
}
