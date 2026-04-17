import type { DEVICE } from 'zss/device'
import type { MESSAGE, VM_BOARDRUNNER_TRANSFER } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import {
  memorysyncupdateboard,
  memorysyncupdatememory,
} from 'zss/device/vm/memorysync'
import { ackboardrunners } from 'zss/device/vm/state'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import {
  memorywriteboardnamed,
  memorywriteboardobjectlookup,
} from 'zss/memory/boardlookup'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memorywritebookflag } from 'zss/memory/bookoperations'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { memorymarkboarddirty } from 'zss/memory/memorydirty'
import {
  memorymoveplayertoboard,
  memorywritebookplayerboard,
} from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { BOARD_ELEMENT, CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

// Phase 3 of the boardrunner authoritative-tick plan: server-mediated
// cross-board player handoff. Runner A (owner of `fromboardid`) emits
// `vm:boardrunnertransfer` when a player walks from its owned board to a
// board it does not own. The server validates ownership, inserts the
// element into the destination board, updates the player's flags on the
// main book, and marks both streams dirty so the next tick cycle pushes
// the update to the destination runner (or to a fallback mutation on
// MEMORY if no runner is elected yet).
export function handleboardrunnertransfer(vm: DEVICE, message: MESSAGE): void {
  const payload = message.data as VM_BOARDRUNNER_TRANSFER | undefined
  if (
    !ispresent(payload) ||
    !isstring(payload.player) ||
    !isstring(payload.fromboardid) ||
    !isstring(payload.toboardid) ||
    !ispresent(payload.element) ||
    !ispresent(payload.dest) ||
    !isnumber(payload.dest.x) ||
    !isnumber(payload.dest.y)
  ) {
    return
  }

  // ownership validation: the emitter must be the elected + acked runner
  // for the source board. This prevents a non-runner peer from forging
  // cross-board insert traffic.
  const runner = ackboardrunners[payload.fromboardid]
  if (!isstring(runner) || runner !== message.player) {
    apilog(
      vm,
      message.player,
      'boardrunnertransfer',
      `ignored: not runner for ${payload.fromboardid}`,
    )
    return
  }

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const destboard = memoryreadboardbyaddress(payload.toboardid)
  if (!ispresent(destboard)) {
    apilog(
      vm,
      message.player,
      'boardrunnertransfer',
      `ignored: destination board ${payload.toboardid} not found`,
    )
    return
  }

  // if the destination board has no elected runner yet, fall back to the
  // in-process move (which also pulls the element off the source board's
  // authoritative MEMORY). Otherwise the source removal already arrived
  // via the runner's board:A clientpatch; we only need to insert on the
  // destination and update flags.
  if (!isstring(ackboardrunners[payload.toboardid])) {
    memorymoveplayertoboard(
      mainbook,
      payload.player,
      payload.toboardid,
      payload.dest,
    )
    return
  }

  // Insert the element (or merge if a prior insert already landed via the
  // destination runner's next hydration cycle). We intentionally overwrite
  // whatever exists at the same id: the runner authoritative payload wins.
  const element: BOARD_ELEMENT = {
    ...payload.element,
    x: payload.dest.x,
    y: payload.dest.y,
    id: payload.element.id ?? payload.player,
  }
  const elementid = element.id!
  destboard.objects[elementid] = element
  memorywriteboardnamed(destboard, element)
  memorywriteboardobjectlookup(destboard, element)
  memorymarkboarddirty(destboard)

  // Update player tracking on the main book so the memory stream reflects
  // the new board + entry point. Reverse-projection on the source runner
  // will pick up the flag changes on its next memory-stream hydration.
  memorywritebookflag(mainbook, payload.player, 'enterx', payload.dest.x)
  memorywritebookflag(mainbook, payload.player, 'entery', payload.dest.y)
  memorywritebookplayerboard(mainbook, payload.player, payload.toboardid)

  // Poke both streams so admitted runners catch up on the next cycle.
  memorysyncupdatememory()
  const destcodepage = memorypickcodepagewithtypeandstat(
    CODE_PAGE_TYPE.BOARD,
    payload.toboardid,
  )
  if (ispresent(destcodepage)) {
    memorysyncupdateboard(destcodepage)
  }
}
