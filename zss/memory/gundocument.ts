/**
 * v1: Sim worker wires local Gun (`memorygunroot`) for session persistence.
 */
import { memoryguninit, memorygunresetfortests } from './memorygunroot'
import { memoryhydratefromgunroot, memoryishydratablegunroot } from './session'

/** @deprecated Use `memorygunresetfortests` — kept for existing test imports. */
export function memorylocalgunresetpersistchainfortests(): void {
  memorygunresetfortests()
}

/** Load persisted root graph from Gun; projection updates from merged `localmemory` listener. */
export function memorylocalguninit(done?: () => void): void {
  memoryguninit(function onmerged(data: unknown) {
    if (memoryishydratablegunroot(data)) {
      memoryhydratefromgunroot(data)
    }
  }, done)
}

/** No-op: session writes go directly to Gun (`memorygunroot`). Kept for ticktock call site stability. */
export function memorylocalgunpersist(): void {}
