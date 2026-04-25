/**
 * Partial-sync scope: owned boards and gadget/flags peer players drive separate
 * `replicateRxCollection` instances (see `streamreplscopedreplication.ts`).
 */
import {
  streamreplscopedsyncboards,
  streamreplscopedsyncflagsplayers,
  streamreplscopedsyncgadgetplayers,
} from './streamreplscopedreplication'

let lastownedboardskey: string | null = null
let lastgadgetpeerkey: string | null = null
let lastflagspeerkey: string | null = null

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

/**
 * Call when gadget/flags peer sets change. `gadgetPeerIds` are real gadget
 * owners (player ids). `flagsPeerIds` defaults to the same set and should be a
 * superset when the boardrunner also replicates `flags:*_chip` and
 * `flags:<board>_tracking` — those bag ids must stay in the flags sync set so
 * `streamreplscopedsyncflagsplayers` does not cancel lazily-started chip repls,
 * but they must not be passed to gadget sync (`gadget:<id>` is only for players).
 */
export function streamreplpartialscopesOnGadgetFlagsPeersChange(
  gadgetPeerIds: Set<string>,
  flagsPeerIds?: Set<string>,
): void {
  const flagPeers = flagsPeerIds ?? gadgetPeerIds
  const gk = boardsetkey(gadgetPeerIds)
  const fk = boardsetkey(flagPeers)
  const gadgetUnchanged = lastgadgetpeerkey !== null && gk === lastgadgetpeerkey
  const flagsUnchanged = lastflagspeerkey !== null && fk === lastflagspeerkey
  if (gadgetUnchanged && flagsUnchanged) {
    return
  }
  if (!flagsUnchanged) {
    lastflagspeerkey = fk
    void streamreplscopedsyncflagsplayers(flagPeers)
  }
  if (!gadgetUnchanged) {
    lastgadgetpeerkey = gk
    void streamreplscopedsyncgadgetplayers(gadgetPeerIds)
  }
}
