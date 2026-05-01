/**
 * Single Gun instance and `memory` chain for sim worker session persistence.
 * Session mutates the graph via `memorygunlocalmemory()`; [`gundocument`](./gundocument.ts) wires init.
 */
import Gun from 'gun/gun'

import { memorygunattachisolatedmesh } from './memorygunmeshisolate'

export type GunMemoryChain = {
  get: (
    arg: string | ((data: unknown, key?: unknown, msg?: unknown) => void),
    opt?: { on: number },
  ) => GunMemoryChain & { put: (v: unknown) => void }
  put: (v: unknown) => void
}

let gunmemory: GunMemoryChain | undefined
let gunlocalskipdepth = 0

/** While > 0, projection listener should ignore Gun callbacks (local write echo). */
export function memorygunlocalskipenter(): void {
  gunlocalskipdepth += 1
}

export function memorygunlocalskipexit(): void {
  gunlocalskipdepth = Math.max(0, gunlocalskipdepth - 1)
}

export function memorygunlocalskipactive(): boolean {
  return gunlocalskipdepth > 0
}

export function memorygunlocalmemory(): GunMemoryChain | undefined {
  return gunmemory
}

/**
 * Create Gun once, return `localmemory` chain, register root merge listener.
 * Idempotent: second call only invokes `done` without stacking listeners (tests reset first).
 */
export function memoryguninit(
  onmergedroot: (data: unknown) => void,
  done?: () => void,
): void {
  if (gunmemory !== undefined) {
    done?.()
    return
  }
  // create instance
  const g = Gun({
    peers: [],
    axe: false,
    radisk: false,
    multicast: false,
    localStorage: false,
    WebSocket: false,
  }) as unknown as { _: unknown; get: (k: string) => GunMemoryChain }

  memorygunattachisolatedmesh(g)

  gunmemory = g.get('memory')
  gunmemory.get(
    function onmerged(data: unknown) {
      if (memorygunlocalskipactive()) {
        return
      }
      onmergedroot(data)
    },
    { on: 1 },
  )
  done?.()
}

/** Tests / hot reload: drop chain so `memoryguninit` can run again. */
export function memorygunresetfortests(): void {
  gunmemory = undefined
  gunlocalskipdepth = 0
}
