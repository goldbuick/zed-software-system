import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerowned } from 'zss/device/api'
import { boardrunnersendsnapshot } from 'zss/device/vm/helpers'
import { memorysyncrevokeboardrunner } from 'zss/device/vm/memorysync'
import { ackboardrunners, boardrunners } from 'zss/device/vm/state'
import { isstring } from 'zss/mapping/types'

// Collect every boardid this player is the acked runner for, used to tell
// the player's worker which boards it currently owns. Without this the
// worker has no way to know it is or isn't authoritative, and would either
// run the tick/paint for every player unconditionally (causing a paint
// storm when multiple workers are admitted to the same board stream) or
// skip everything (leaving boards un-ticked after an election flip).
function playerownedboards(player: string): string[] {
  const result: string[] = []
  const boards = Object.keys(ackboardrunners)
  for (let i = 0; i < boards.length; ++i) {
    if (ackboardrunners[boards[i]] === player) {
      result.push(boards[i])
    }
  }
  return result
}

export function handleackboardrunner(vm: DEVICE, message: MESSAGE): void {
  const boardid = message.data
  if (!isstring(boardid) || !boardid) {
    return
  }
  if (message.player !== boardrunners[boardid]) {
    return
  }

  // Capture any previous owner before we overwrite. If the election just
  // flipped from another player to this one, the previous owner must have
  // their jsonsync admissions revoked and their worker told it no longer
  // owns this board — otherwise both runners would receive pokes / writes
  // and emit conflicting gadget paints.
  const previous = ackboardrunners[boardid]
  const flipped =
    isstring(previous) && previous.length > 0 && previous !== message.player
  if (flipped) {
    memorysyncrevokeboardrunner(previous, boardid)
  }

  ackboardrunners[boardid] = message.player

  if (flipped) {
    boardrunnerowned(vm, previous, playerownedboards(previous))
  }
  boardrunnerowned(vm, message.player, playerownedboards(message.player))

  boardrunnersendsnapshot(message.player, boardid)
}
