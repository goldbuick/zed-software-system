import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerowned } from 'zss/device/api'
import { boardrunnersendsnapshot } from 'zss/device/vm/helpers'
import { memorysyncrevokeboardrunner } from 'zss/device/vm/memorysync'
import {
  ackboardrunners,
  boardrunners,
  boardrunnerlastacktickat,
  failedboardrunners,
  playerboardrunnerowntarget,
} from 'zss/device/vm/state'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryreadbookflag } from 'zss/memory/bookoperations'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

/**
 * Sim-side `playermovetoboard`: when the destination board has no acked runner
 * yet, grant the moved player ack + elected slot immediately so `second` does
 * not count ack-timeout against them and admissions match their new `board`.
 */
export function grantboardrunnerackaftersimmove(
  vm: DEVICE,
  player: string,
  boardid: string,
): void {
  if (!isstring(boardid) || !boardid) {
    return
  }
  const existingack = ackboardrunners[boardid]
  if (isstring(existingack) && existingack.length > 0) {
    return
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const playerboard = memoryreadbookflag(mainbook, player, 'board')
  if (!isstring(playerboard) || playerboard !== boardid) {
    return
  }

  const refresh = new Set<string>()

  const staleackids = Object.keys(ackboardrunners).filter(
    (obid) => obid !== boardid && ackboardrunners[obid] === player,
  )
  for (let oi = 0; oi < staleackids.length; ++oi) {
    const obid = staleackids[oi]
    delete ackboardrunners[obid]
    memorysyncrevokeboardrunner(player, obid)
  }

  const pending = boardrunners[boardid]
  if (isstring(pending) && pending.length > 0 && pending !== player) {
    memorysyncrevokeboardrunner(pending, boardid)
    refresh.add(pending)
    delete boardrunners[boardid]
  }

  ackboardrunners[boardid] = player
  boardrunners[boardid] = player
  boardrunnerlastacktickat[boardid] = Date.now()

  if (failedboardrunners[boardid]?.[player] !== undefined) {
    delete failedboardrunners[boardid][player]
    if (Object.keys(failedboardrunners[boardid]).length === 0) {
      delete failedboardrunners[boardid]
    }
  }

  refresh.add(player)
  refresh.forEach((pid) => {
    boardrunnerowned(vm, pid, playerboardrunnerowntarget(pid))
  })

  boardrunnersendsnapshot(player, boardid)
}

/**
 * Promote elected runner to tick-confirmed ack: revokes, `ackboardrunners`,
 * snapshot, ownership refresh. Caller must validate book flags and runner slot.
 */
export function applyboardrunnerackpromotion(
  vm: DEVICE,
  player: string,
  boardid: string,
): void {
  // One book `board` flag: drop orphan ack slots (e.g. HF) that still name
  // this player after they ack their real board (title). Otherwise
  // playerownedboard can sort HF before title and flash wrong ownedboard.
  const staleackids = Object.keys(ackboardrunners).filter(
    (obid) => obid !== boardid && ackboardrunners[obid] === player,
  )
  for (let oi = 0; oi < staleackids.length; ++oi) {
    const obid = staleackids[oi]
    delete ackboardrunners[obid]
    memorysyncrevokeboardrunner(player, obid)
  }

  const previous = ackboardrunners[boardid]
  const flipped =
    isstring(previous) && previous.length > 0 && previous !== player
  if (flipped) {
    memorysyncrevokeboardrunner(previous, boardid)
  }

  ackboardrunners[boardid] = player

  if (failedboardrunners[boardid]?.[player] !== undefined) {
    delete failedboardrunners[boardid][player]
    if (Object.keys(failedboardrunners[boardid]).length === 0) {
      delete failedboardrunners[boardid]
    }
  }

  const refresh = new Set<string>()
  if (flipped && isstring(previous) && previous.length > 0) {
    refresh.add(previous)
  }
  refresh.add(player)
  refresh.forEach((pid) => {
    boardrunnerowned(vm, pid, playerboardrunnerowntarget(pid))
  })

  boardrunnersendsnapshot(player, boardid)
}

/** Assignment ack is superseded by `vm:acktick` (`handleacktick`). */
export function handleackboardrunner(_vm: DEVICE, _message: MESSAGE): void {
  void _vm
  void _message
}
