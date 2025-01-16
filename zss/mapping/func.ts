import { api_error, DEVICELIKE } from 'zss/device/api'

export function doasync(device: DEVICELIKE, asyncfunc: () => Promise<void>) {
  function logerror(error: Error) {
    api_error(device, 'crash', error.message)
  }
  asyncfunc().catch(logerror)
}
