/**
 * Single serial FIFO for all heavy worker jobs (LLM, TTS, preset apply, etc.):
 * the next job starts only after the previous job's promise settles.
 */
import { type DEVICELIKE, apierror } from 'zss/device/api'

let heavyjobchain: Promise<unknown> = Promise.resolve()

export function enqueueheavyjob(
  device: DEVICELIKE,
  player: string,
  job: () => Promise<void>,
) {
  heavyjobchain = heavyjobchain
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
