import { api_error } from 'zss/device/api'

export function doasync(label: string, asyncfunc: () => Promise<void>) {
  function logerror(error: Error) {
    console.error(error)
    api_error(label, 'crash', error.message)
  }
  asyncfunc().catch(logerror)
}
