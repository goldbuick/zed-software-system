/**
 * Serial FIFOs for heavy model handlers. Classifier path (SmolLM) vs direct prompt path (Llama)
 * are queued separately; merge to one chain here if WebGPU contention requires single-flight.
 */
import { type DEVICELIKE, apierror } from 'zss/device/api'

let classifyhandlerchain: Promise<unknown> = Promise.resolve()
let promprthandlerchain: Promise<unknown> = Promise.resolve()

export function enqueueheavymodelclassifyjob(
  device: DEVICELIKE,
  player: string,
  job: () => Promise<void>,
) {
  classifyhandlerchain = classifyhandlerchain
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

export function enqueueheavymodelpromptjob(
  device: DEVICELIKE,
  player: string,
  job: () => Promise<void>,
) {
  promprthandlerchain = promprthandlerchain
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
