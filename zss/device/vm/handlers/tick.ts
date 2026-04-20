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
  BOARDRUNNER_ACK_FAIL_COUNT,
  ackboardrunners,
  boardrunners,
  failedboardrunners,
  playerboardrunnerowntarget,
  tracking,
} from 'zss/device/vm/state'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadboardrunnerchoices,
  memoryscanplayers,
} from 'zss/memory/playermanagement'
import { memorytickloaders } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadfreeze,
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

  perfmeasure('vm:memorytickloaders', () => {
    // Server runs loader chips + frame clock only. Per-board chip code runs in
    // elected boardrunner workers (`memorytickmain`). Pilot ticks also moved
    // to the worker (see boardrunneruser.ts).
    memorytickloaders()
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
    ackboardrunners,
  )

  // players whose ownership set changed this tick, so we only emit one
  // refresh per player at the end.
  const ownershipdirty = new Set<string>()

  // Keep `boardrunners` aligned with a valid ack: election never displaces an
  // acked runner by tracking, but pending `boardrunners` can lag after races.
  const ackboards = Object.keys(ackboardrunners)
  for (let ai = 0; ai < ackboards.length; ++ai) {
    const boardid = ackboards[ai]
    const ack = ackboardrunners[boardid]
    if (!isstring(ack) || !ack.length) {
      continue
    }
    if (failedboardrunners[boardid]?.[ack] === BOARDRUNNER_ACK_FAIL_COUNT) {
      continue
    }
    const onboard = playeridsbyboard[boardid] ?? []
    if (!onboard.includes(ack)) {
      continue
    }
    const prev = boardrunners[boardid]
    if (prev === ack) {
      if (failedboardrunners[boardid]?.[ack] !== undefined) {
        delete failedboardrunners[boardid][ack]
        if (Object.keys(failedboardrunners[boardid]).length === 0) {
          delete failedboardrunners[boardid]
        }
      }
      continue
    }
    if (ispresent(prev) && isstring(prev) && prev.length > 0) {
      ownershipdirty.add(prev)
      if (failedboardrunners[boardid]?.[prev] !== undefined) {
        delete failedboardrunners[boardid][prev]
        if (Object.keys(failedboardrunners[boardid]).length === 0) {
          delete failedboardrunners[boardid]
        }
      }
    }
    boardrunners[boardid] = ack
    ownershipdirty.add(ack)
    if (failedboardrunners[boardid]?.[ack] !== undefined) {
      delete failedboardrunners[boardid][ack]
      if (Object.keys(failedboardrunners[boardid]).length === 0) {
        delete failedboardrunners[boardid]
      }
    }
  }

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
      ownershipdirty.add(elected)
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

  // emit refreshed owned-board id for any player whose runner assignment changed
  ownershipdirty.forEach((player) => {
    boardrunnerowned(vm, player, playerboardrunnerowntarget(player))
  })
}
