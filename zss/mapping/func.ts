import { api_error } from 'zss/device/api'

function logerror(error: Error) {
  api_error('async', 'crash', error.message)
}

export function doasync(
  asyncfunc: () => Promise<void>,
  errorfunc: (error: Error) => void = logerror,
) {
  asyncfunc().catch(errorfunc)
}
