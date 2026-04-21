import { LOG_DEBUG } from 'zss/config'
import type { DEVICE } from 'zss/device'
import type { MESSAGE, VM_PLAYERMOVETOBOARD } from 'zss/device/api'
import { boardrunnerowned } from 'zss/device/api'
import { grantboardrunnerackaftersimmove } from 'zss/device/vm/handlers/ackboardrunner'
import { boardrunnersendsnapshot } from 'zss/device/vm/helpers'
import {
  memorysyncrevokeboardrunner,
  memorysyncupdateboard,
  memorysyncupdatememory,
} from 'zss/device/vm/memorysync'
import {
  ackboardrunners,
  boardrunners,
  clearboardrunnerlastacktick,
  failedboardrunners,
  playerboardrunnerowntarget,
} from 'zss/device/vm/state'
import { ispresent, isstring } from 'zss/mapping/types'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import {
  memorymoveplayertoboard,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'
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
  if (LOG_DEBUG) {
    // Ordered vs `[sim] rxreplserver:push_batch board streams` in devtools.
    console.debug('[sim] vm:playermovetoboard', {
      player: message.player,
      board: payload.board,
      dest: payload.dest,
      fromboardid,
      moved,
    })
  }
  if (!moved) {
    // TODO: send message so boardrunner can THUD the player
    return
  }

  if (
    fromboardid &&
    (boardrunners[fromboardid] === message.player ||
      ackboardrunners[fromboardid] === message.player)
  ) {
    delete boardrunners[fromboardid]
    delete ackboardrunners[fromboardid]
    clearboardrunnerlastacktick(fromboardid)
    delete failedboardrunners[fromboardid]
    memorysyncrevokeboardrunner(message.player, fromboardid)
    boardrunnerowned(
      vm,
      message.player,
      playerboardrunnerowntarget(message.player),
    )
  }

  // Push dest board BEFORE the memory stream so the worker sees the player
  // in board.objects of B before it learns (via the memory stream) that
  // player.board === B. Otherwise a gadget sync tick can fire between the two
  // hydrations and emit a gadget with no CONTROL layer (memoryreadobject
  // returns undefined), causing the client to briefly fall back to
  // VIEWSCALE.MID and flip the zoom.
  const destcodepage = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.BOARD,
    payload.board,
  )
  if (ispresent(destcodepage)) {
    memorysyncupdateboard(destcodepage)
  }
  memorysyncupdatememory()
  if (fromboardid) {
    const sourcecodepage = memorypickcodepagewithtypeandstat(
      CODE_PAGE_TYPE.BOARD,
      fromboardid,
    )
    if (ispresent(sourcecodepage)) {
      memorysyncupdateboard(sourcecodepage)
    }
  }

  const priordestack = ackboardrunners[payload.board]
  grantboardrunnerackaftersimmove(vm, message.player, payload.board)

  // When the destination already had an acked runner, grantboardrunnerackaftersimmove
  // returns early without snapshot. Re-admit that runner so gadget:<pid> / flags:<pid>
  // streams include every viewport player (collectviewportpidsforboard); otherwise
  // joiners never receive streamrepl rows for their own gadget stream.
  if (isstring(priordestack) && priordestack.length > 0) {
    const destack = ackboardrunners[payload.board]
    if (isstring(destack) && destack.length > 0) {
      boardrunnersendsnapshot(destack, payload.board)
    }
  }
}
