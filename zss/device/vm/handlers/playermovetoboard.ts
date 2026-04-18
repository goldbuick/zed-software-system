import type { DEVICE } from 'zss/device'
import type { MESSAGE, VM_PLAYERMOVETOBOARD } from 'zss/device/api'
import {
  memorysyncupdateboard,
  memorysyncupdatememory,
} from 'zss/device/vm/memorysync'
import {
  ackboardrunners,
  boardrunners,
  failedboardrunners,
} from 'zss/device/vm/state'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import {
  memorymoveplayertoboard,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

export function handleplayermovetoboard(_vm: DEVICE, message: MESSAGE): void {
  void _vm
  const payload = message.data as VM_PLAYERMOVETOBOARD | undefined
  if (
    !ispresent(payload) ||
    !isstring(payload.board) ||
    !payload.board ||
    !ispresent(payload.dest) ||
    !isnumber(payload.dest.x) ||
    !isnumber(payload.dest.y) ||
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
  }

  memorysyncupdatememory()
  const destcodepage = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.BOARD,
    payload.board,
  )
  if (ispresent(destcodepage)) {
    memorysyncupdateboard(destcodepage)
  }
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
