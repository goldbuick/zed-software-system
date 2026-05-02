/**
 * Sim worker MEMORY projection bootstrap (no external graph).
 */

/** @deprecated No-op — kept for existing test imports. */
export function memorylocalgunresetpersistchainfortests(): void {}

/** Projection-only memory; invoke callback when ready. */
export function memorylocalguninit(done?: () => void): void {
  done?.()
}
