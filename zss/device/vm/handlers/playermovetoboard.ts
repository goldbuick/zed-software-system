import type { DEVICE } from 'zss/device'
import {
  type MESSAGE,
  type VM_PLAYERMOVETOBOARD,
  boardrunnerowned,
} from 'zss/device/api'
import {
  boardhasvalidrunner,
  ensureboardrunnerelected,
  revokeboardrunnerassignment,
} from 'zss/device/vm/boardrunnerelection'
import { memorysyncpushdirty } from 'zss/device/vm/memorysimsync'
import { boardrunners, skipboardrunners } from 'zss/device/vm/state'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memorymoveplayertoboard,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { ispt } from 'zss/words/dir'

export function handleplayermovetoboard(vm: DEVICE, message: MESSAGE): void {
  const payload = message.data as VM_PLAYERMOVETOBOARD | undefined
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (
    !ispresent(payload) ||
    !ispresent(mainbook) ||
    !ispt(payload.dest) ||
    !isstring(payload.board) ||
    payload.board.length === 0 ||
    !isstring(message.player) ||
    !message.player
  ) {
    return
  }

  const fromboard = memoryreadplayerboard(message.player)
  const fromboardid = fromboard?.id ?? ''
  if (fromboardid === payload.board) {
    // we're already on the board, so we don't need to do anything
    return
  }

  const moved = memorymoveplayertoboard(
    mainbook,
    message.player,
    payload.board,
    payload.dest,
  )
  if (!moved) {
    // TODO: send message so boardrunner can THUD the player
    return
  }

  let didsync = false
  const ts = Date.now()
  const dest = payload.board
  const player = message.player

  // we have left this board, so we need to revoke the runner if its us
  if (player === boardrunners[fromboardid]) {
    revokeboardrunnerassignment(fromboardid)
    ensureboardrunnerelected(vm, fromboardid, ts)
    didsync = true
  }

  // we have arrived at a new board, so we need to ensure a runner is elected
  if (!boardhasvalidrunner(dest)) {
    // Arriving on a board should allow this player to be elected even if they
    // were skip-flagged for stale ack elsewhere; otherwise pick has no winner.
    delete skipboardrunners[player]
    ensureboardrunnerelected(vm, dest, ts)
    didsync = true
  }

  // sync the dirty state
  if (didsync) {
    memorysyncpushdirty()
  }

  if (player !== boardrunners[dest]) {
    // if we are not the new runner we need to
    // signal that we are no longer running the previous board
    boardrunnerowned(vm, player, '')
  }
}
