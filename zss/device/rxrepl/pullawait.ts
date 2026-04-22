import type { RXREPL_PULL_RESPONSE } from './types'

type PullWaiter = (body: RXREPL_PULL_RESPONSE) => void

let pending: PullWaiter | null = null

/**
 * Single-flight waiter for one sim `pull_response` after `rxreplpullrequest`.
 * Used by replication `pull.handler` on the client hub.
 */
export function streamreplpullawaitregister(): Promise<RXREPL_PULL_RESPONSE> {
  return new Promise((resolve) => {
    pending = resolve
  })
}

export function streamreplpullawaitnotify(body: RXREPL_PULL_RESPONSE): void {
  const p = pending
  pending = null
  p?.(body)
}

export function streamreplpullawaitclear(): void {
  pending = null
}
