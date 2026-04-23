import type { RXREPL_PUSH_ACK } from './types'

type Ackresolve = (ack: RXREPL_PUSH_ACK) => void

const queue: Ackresolve[] = []

let pushserializedtail: Promise<void> = Promise.resolve()

/** FIFO waiters: one `rxreplclient:push_ack` per prior `rxreplpushbatch` from replication `push.handler`. */
export function streamreplpushawaitregister(): Promise<RXREPL_PUSH_ACK> {
  return new Promise((resolve) => {
    queue.push(resolve)
  })
}

export function streamreplpushawaitnotify(ack: RXREPL_PUSH_ACK): void {
  const r = queue.shift()
  r?.(ack)
}

export function streamreplpushawaitclear(): void {
  queue.length = 0
  pushserializedtail = Promise.resolve()
}

/** One in-flight `push_batch` + `push_ack` pair at a time (multi-family repl may push concurrently). */
export function streamreplpushawaitserializedop<T>(
  op: () => Promise<T>,
): Promise<T> {
  const run = pushserializedtail.then(op)
  pushserializedtail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}
