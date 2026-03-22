/**
 * Single serial FIFO for heavy model work: each job may run classification
 * and then await the full agent prompt; the next job starts only after both finish.
 */
import { type DEVICELIKE, apierror } from 'zss/device/api'

let modelhandlerchain: Promise<unknown> = Promise.resolve()

export function enqueueheavymodeljob(
  device: DEVICELIKE,
  player: string,
  job: () => Promise<void>,
) {
  modelhandlerchain = modelhandlerchain
    .then(() => job())
    .catch((error: unknown) => {
      console.error(error)
      apierror(
        device,
        player,
        'crash',
        error instanceof Error ? error.message : String(error),
      )
    })
}
