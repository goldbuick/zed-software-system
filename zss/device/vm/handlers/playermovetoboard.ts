import type { DEVICE } from 'zss/device'
import type { MESSAGE, VM_PLAYERMOVETOBOARD } from 'zss/device/api'
import { boardrunnerowned } from 'zss/device/api'
import {
  memorysyncrevokeboardrunner,
  memorysyncupdateboard,
  memorysyncupdatememory,
} from 'zss/device/vm/memorysync'
import {
  ackboardrunners,
  boardrunners,
  failedboardrunners,
  playerownedboard,
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

  if (
    fromboardid &&
    (boardrunners[fromboardid] === message.player ||
      ackboardrunners[fromboardid] === message.player)
  ) {
    delete boardrunners[fromboardid]
    delete ackboardrunners[fromboardid]
    delete failedboardrunners[fromboardid]
    memorysyncrevokeboardrunner(message.player, fromboardid)
    boardrunnerowned(vm, message.player, playerownedboard(message.player))
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
}
