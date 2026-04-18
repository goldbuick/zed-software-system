import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerowned } from 'zss/device/api'
import { boardrunnersendsnapshot } from 'zss/device/vm/helpers'
import { memorysyncrevokeboardrunner } from 'zss/device/vm/memorysync'
import {
  ackboardrunners,
  boardrunners,
  playerownedboard,
} from 'zss/device/vm/state'
import { memoryreadbookflag } from 'zss/memory/bookoperations'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { ispresent, isstring } from 'zss/mapping/types'

export function handleackboardrunner(vm: DEVICE, message: MESSAGE): void {
  const boardid = message.data
  if (!isstring(boardid) || !boardid) {
    return
  }
  if (message.player !== boardrunners[boardid]) {
    return
  }

  // Reject stale asks: the client auto-acks every `register:boardrunnerask`.
  // During join / multi-board races the elected slot can briefly reference a
  // player whose `board` flag is still another codepage id — accepting that
  // ack would set ackboardrunners for the wrong board and flash
  // boardrunner:ownedboard (see debug session 91899f).
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const playerboard = memoryreadbookflag(mainbook, message.player, 'board')
  if (!isstring(playerboard) || playerboard !== boardid) {
    return
  }

  // One book `board` flag: drop orphan ack slots (e.g. HF) that still name
  // this player after they ack their real board (title). Otherwise
  // playerownedboard can sort HF before title and flash wrong ownedboard.
  const staleackids = Object.keys(ackboardrunners).filter(
    (obid) => obid !== boardid && ackboardrunners[obid] === message.player,
  )
  for (let oi = 0; oi < staleackids.length; ++oi) {
    const obid = staleackids[oi]
    delete ackboardrunners[obid]
    memorysyncrevokeboardrunner(message.player, obid)
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

  const refresh = new Set<string>()
  if (flipped && isstring(previous) && previous.length > 0) {
    refresh.add(previous)
  }
  refresh.add(message.player)
  refresh.forEach((pid) => {
    boardrunnerowned(vm, pid, playerownedboard(pid))
  })

  boardrunnersendsnapshot(message.player, boardid)
}
