import type { DEVICE } from 'zss/device'
import type { MESSAGE, VM_PLAYERMOVETOBOARD } from 'zss/device/api'
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
  memoryreadplayersfromboard,
} from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { ispt } from 'zss/words/dir'

export function handleplayermovetoboard(vm: DEVICE, message: MESSAGE): void {
  const payload = message.data as VM_PLAYERMOVETOBOARD | undefined
  if (
    !ispresent(payload) ||
    !ispt(payload.dest) ||
    !isstring(payload.board) ||
    payload.board.length === 0 ||
    !isstring(message.player) ||
    !message.player
  ) {
    return
  }

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const fromboard = memoryreadplayerboard(message.player)
  const fromboardid = fromboard?.id ?? ''

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

  const dest = payload.board
  const player = message.player
  let didsync = false
  const ts = Date.now()

  if (
    fromboardid.length > 0 &&
    fromboardid !== dest &&
    boardrunners[fromboardid] === player
  ) {
    revokeboardrunnerassignment(vm, fromboardid)
    didsync = true
    ensureboardrunnerelected(vm, fromboardid, ts)
  }

  if (!boardhasvalidrunner(dest)) {
    if (memoryreadplayersfromboard(dest).includes(player)) {
      delete skipboardrunners[player]
    }
    revokeboardrunnerassignment(vm, dest)
    ensureboardrunnerelected(vm, dest, ts)
    didsync = true
  }

  if (didsync) {
    memorysyncpushdirty()
  }
}
