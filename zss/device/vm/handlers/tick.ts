import type { DEVICE } from 'zss/device'
import {
  type MESSAGE,
  boardrunnerowned,
  registerboardrunnerask,
} from 'zss/device/api'
import {
  memorysyncpushdirty,
  memorysyncrevokeboardrunner,
} from 'zss/device/vm/memorysync'
import {
  ackboardrunners,
  boardrunners,
  failedboardrunners,
  playerownedboard,
  tracking,
} from 'zss/device/vm/state'
import { ispresent } from 'zss/mapping/types'
import {
  memoryreadboardrunnerchoices,
  memoryscanplayers,
} from 'zss/memory/playermanagement'
import { memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadfreeze,
  memoryreadhalt,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

export function handletick(vm: DEVICE, _message: MESSAGE): void {
  void _message
  if (memoryreadfreeze()) {
    return
  }

  // Same invariant as handlesecond: every activelist / on-board pid must have a
  // tracking slot before boardrunner election. handlesecond only runs 1 Hz; a
  // new /join/ player can land on activelist mid-second while handletick runs
  // every frame — undefined tracking becomes score 1000 in
  // memoryreadboardrunnerchoices and they cannot be elected until the next
  // second's scan.
  memoryscanplayers(tracking)

  perfmeasure('vm:memorytickmain', () => {
    // Phase 2 of the boardrunner authoritative-tick plan: server runs only
    // the loader half of the tick. Per-board chip code runs in elected
    // boardrunner workers, which push their results via jsonsyncclientedit.
    // Pilot ticks also moved to the worker (see boardrunneruser.ts).
    memorytickmain(memoryreadhalt(), true)
  })

  // drain any per-stream dirty bits set during the tick (player flags, board
  // mutations, freeze flips, etc.) and push refreshed projections to
  // jsonsync. freeze guard above already short-circuits the whole tick;
  // unregistered streams are silently skipped inside `memorysyncpushdirty`.
  perfmeasure('vm:memorysyncpushdirty', () => {
    memorysyncpushdirty()
  })

  // Board runner election: same `tracking` as DOOT idle (incremented above when sim is unfrozen).
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const { runnerchoices, playeridsbyboard } = memoryreadboardrunnerchoices(
    mainbook,
    tracking,
    failedboardrunners,
    // Passing the current ack map in turns the election sticky: a fresh
    // joiner with initial tracking = INITIAL_TRACKING can't instantly
    // displace an acked runner whose score is only slightly higher.
    ackboardrunners,
  )

  // players whose ownership set changed this tick, so we only emit one
  // refresh per player at the end.
  const ownershipdirty = new Set<string>()

  // iterate through active boards
  const choiceboards = Object.keys(runnerchoices)
  for (let i = 0; i < choiceboards.length; ++i) {
    const boardid = choiceboards[i]
    const maybeplayer = boardrunners[boardid]
    const playerids = playeridsbyboard[boardid] ?? []
    if (ispresent(maybeplayer)) {
      // validate the the picked player is still active on the given board
      if (playerids.includes(maybeplayer)) {
        // keep it
      } else {
        // the current runner is no longer standing on this board (moved to
        // a different board or logged out mid-tick). Revoke any admissions
        // so the old runner's worker stops receiving pokes / snapshots.
        const prevack = ackboardrunners[boardid]
        if (typeof prevack === 'string' && prevack.length > 0) {
          memorysyncrevokeboardrunner(prevack, boardid)
          ownershipdirty.add(prevack)
        }
        delete boardrunners[boardid]
        delete ackboardrunners[boardid]
        delete failedboardrunners[boardid]
      }
    }
    // elect a player
    if (!ispresent(boardrunners[boardid])) {
      const elected = runnerchoices[boardid]
      boardrunners[boardid] = elected
      // If we had a different acked runner on this board, clear their ack
      // and admissions — the new elected player will be admitted on ack.
      const prevack = ackboardrunners[boardid]
      if (
        typeof prevack === 'string' &&
        prevack.length > 0 &&
        prevack !== elected
      ) {
        memorysyncrevokeboardrunner(prevack, boardid)
        ownershipdirty.add(prevack)
      }
      delete ackboardrunners[boardid]
      failedboardrunners[boardid] ??= {}
      failedboardrunners[boardid][elected] = 0
      registerboardrunnerask(vm, elected, boardid)
    }
  }

  // drop runners with no active players
  const activeboards = Object.keys(boardrunners)
  for (let i = 0; i < activeboards.length; ++i) {
    const boardid = activeboards[i]
    const playerids = playeridsbyboard[boardid] ?? []
    if (playerids.length === 0) {
      const prevack = ackboardrunners[boardid]
      if (typeof prevack === 'string' && prevack.length > 0) {
        memorysyncrevokeboardrunner(prevack, boardid)
        ownershipdirty.add(prevack)
      }
      delete boardrunners[boardid]
      delete ackboardrunners[boardid]
      delete failedboardrunners[boardid]
    }
  }

  // emit refreshed owned-board id for any player whose acked boards changed
  ownershipdirty.forEach((player) => {
    boardrunnerowned(vm, player, playerownedboard(player))
  })
}
