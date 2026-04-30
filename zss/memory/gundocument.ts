/**
 * v1: Local Gun.js persistence for the memory root document (no room mirror / mesh).
 * Root is stored as a nested Gun graph under `zss/localmemory` (not a monolithic JSON `snap` string).
 * Legacy `snap` string values are migrated once into the graph then cleared.
 */
import Gun from 'gun'

import type { MEMORY_ROOT_SNAPSHOT } from './session'
import {
  memoryhydratefromgunroot,
  memoryhydraterootfromsnapshot,
  memorygunputpayload,
  memoryishydratablegunroot,
} from './session'

/** Gun chain typing is loose — Gun's generics don't model dynamic paths. */
type GunMemoryChain = {
  get: (
    arg:
      | string
      | ((
          data: unknown,
          key?: unknown,
          msg?: unknown,
        ) => void),
    opt?: { on: number },
  ) => GunMemoryChain & { put: (v: unknown) => void }
  put: (v: unknown) => void
}

let persistchain: GunMemoryChain | undefined

/** Clears the local Gun chain (tests that call `memorylocalguninit` more than once). */
export function memorylocalgunresetpersistchainfortests(): void {
  persistchain = undefined
}

/** Load persisted root graph from Gun; migrate legacy `snap` string if present. */
export function memorylocalguninit(done?: () => void): void {
  const g = Gun({
    peers: [],
    multicast: false,
    axe: false,
  }) as unknown as { get: (k: string) => GunMemoryChain }
  persistchain = g.get('zss').get('localmemory')

  persistchain.get(
    function ongraph(data: unknown) {
      if (memoryishydratablegunroot(data)) {
        memoryhydratefromgunroot(data)
      }
    },
    { on: 1 },
  )

  persistchain.get('snap').get(
    function onlegacy(data: unknown) {
      if (typeof data !== 'string' || data.length === 0) {
        return
      }
      try {
        const parsed = JSON.parse(data) as MEMORY_ROOT_SNAPSHOT
        memoryhydraterootfromsnapshot(parsed)
        if (persistchain !== undefined) {
          persistchain.put(memorygunputpayload())
          persistchain.get('snap').put('')
        }
      } catch {
        // ignore bad legacy snapshot
      }
    },
    { on: 1 },
  )

  done?.()
}

/** Persist current memory root as a nested graph on `localmemory` (Gun `.put` tree). */
export function memorylocalgunpersist(): void {
  if (persistchain === undefined) {
    return
  }
  try {
    persistchain.put(memorygunputpayload())
  } catch {
    // ignore put failures
  }
}
