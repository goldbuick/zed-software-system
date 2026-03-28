declare module 'react-dom' {
  /** Batches React updates for Zustand `useSyncExternalStore` subscribers (tick / clock hub path). */
  export function unstable_batchedUpdates(fn: () => void): void
}
