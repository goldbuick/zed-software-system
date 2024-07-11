import { noop } from './types'

export function doasync(
  asyncfunc: () => Promise<void>,
  errorfunc: (error: Error) => void = noop,
) {
  asyncfunc().catch(errorfunc)
}
