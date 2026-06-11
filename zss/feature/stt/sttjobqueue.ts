/**
 * Single serial FIFO for STT worker jobs (ensure, transcribe, dispose).
 */
let sttjobchain: Promise<unknown> = Promise.resolve()

export function enqueuesttjob(job: () => Promise<void>) {
  sttjobchain = sttjobchain
    .then(() => job())
    .catch((error: unknown) => {
      console.error(error)
    })
}
