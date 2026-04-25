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

/**
 * Call when gadget/flags peer set changes (self + joiners on owned boards, plus
 * any extra `flags:` bag ids such as `<board>_tracking`).
 * Deduped like owned boards: avoid re-running scoped sync every tick — each run
 * cancels flags repls not in the set (including lazily-started `*_chip`), which
 * races replication and breaks updates (e.g. sim `vm:cli` / `#set` → boardrunner).
 */
export function streamreplpartialscopesOnGadgetFlagsPeersChange(
  peerPlayerIds: Set<string>,
): void {
  const k = boardsetkey(peerPlayerIds)
  if (lastgadgetflagspeerskey !== null && k === lastgadgetflagspeerskey) {
    return
  }
  lastgadgetflagspeerskey = k
  void streamreplscopedsyncflagsplayers(peerPlayerIds)
  void streamreplscopedsyncgadgetplayers(peerPlayerIds)
}
