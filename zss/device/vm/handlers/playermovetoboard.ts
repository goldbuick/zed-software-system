import type { DEVICE } from 'zss/device'
import { type MESSAGE, boardrunnerowned } from 'zss/device/api'
import {
  boardhasvalidrunner,
  ensureboardrunnerelected,
  revokeboardrunnerassignment,
} from 'zss/device/vm/boardrunnerelection'
import { memorysyncpushdirty } from 'zss/device/vm/memorysimsync'
import { boardrunners, skipboardrunners } from 'zss/device/vm/state'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memorymoveplayertoboard,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { ispt } from 'zss/words/dir'

export function handleplayermovetoboard(vm: DEVICE, message: MESSAGE): void {
  const raw = message.data
  if (
    !isarray(raw) ||
    raw.length < 2 ||
    !isstring(message.player) ||
    !message.player
  ) {
    return
  }
  const boardid = raw[0]
  const destpt = raw[1]
  if (!isstring(boardid) || boardid.length === 0 || !ispt(destpt)) {
    return
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const fromboard = memoryreadplayerboard(message.player)
  const fromboardid = fromboard?.id ?? ''
  if (fromboardid === boardid) {
    // we're already on the board, so we don't need to do anything
    return
  }

  const moved = memorymoveplayertoboard(
    mainbook,
    message.player,
    boardid,
    destpt,
  )
  if (!moved) {
    // TODO: send message so boardrunner can THUD the player
    return
  }

  let didsync = false
  const ts = Date.now()
  const destboard = boardid
  const player = message.player

  // we have left this board, so we need to revoke the runner if its us
  if (player === boardrunners[fromboardid]) {
    revokeboardrunnerassignment(fromboardid)
    ensureboardrunnerelected(vm, fromboardid, ts)
    didsync = true
  }

  // we have arrived at a new board, so we need to ensure a runner is elected
  if (!boardhasvalidrunner(destboard)) {
    // Arriving on a board should allow this player to be elected even if they
    // were skip-flagged for stale ack elsewhere; otherwise pick has no winner.
    delete skipboardrunners[player]
    ensureboardrunnerelected(vm, destboard, ts)
    didsync = true
  }

  // sync the dirty state
  if (didsync) {
    memorysyncpushdirty()
  }

  if (player !== boardrunners[destboard]) {
    // if we are not the new runner we need to
    // signal that we are no longer running the previous board
    boardrunnerowned(vm, player, '')
  }
}
