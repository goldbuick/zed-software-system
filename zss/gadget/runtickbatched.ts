import { unstable_batchedUpdates } from 'react-dom'

/** Runs synchronous hub work so Zustand-driven React updates (`useSyncExternalStore`) coalesce where possible. */
export function runtickbatched(run: () => void): void {
  unstable_batchedUpdates(run)
}
