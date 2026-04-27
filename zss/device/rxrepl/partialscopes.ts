/**
 * Partial-sync scope: owned boards and gadget/flags peer players drive separate
 * `replicateRxCollection` instances (see `streamreplscopedreplication.ts`).
 */
import {
  streamreplscopedsyncboards,
  streamreplscopedsyncflagsplayers,
} from './streamreplscopedreplication'

let lastownedboardskey: string | null = null
let lastgadgetflagspeerskey: string | null = null

function boardsetkey(ids: Set<string>): string {
  return [...ids].sort().join(',')
}

/** Call when `ownedboards` (board ids) changes — e.g. from boardrunner `rebuildownedboardids`. */
export function streamreplpartialscopesOnOwnedBoardsChange(
  ownedBoardIds: Set<string>,
): void {
  const k = boardsetkey(ownedBoardIds)
  if (lastownedboardskey !== null && k === lastownedboardskey) {
    return
  }
  lastownedboardskey = k
  void streamreplscopedsyncboards(ownedBoardIds)
}

/** Deduped peer set for scoped flags replication (see `partialscopes.dedupe.test.ts`). */
export function streamreplpartialscopesOnGadgetFlagsPeersChange(
  peers: Set<string>,
): void {
  const k = boardsetkey(peers)
  if (lastgadgetflagspeerskey !== null && k === lastgadgetflagspeerskey) {
    return
  }
  lastgadgetflagspeerskey = k
  void streamreplscopedsyncflagsplayers(peers)
}
