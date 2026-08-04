import type { DEVICE } from 'zss/device'
import { boardrunneridle, boardrunnerthud } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import {
  boardrunnerassign,
  boardrunnerassignmentvalid,
  boardrunnerelect,
} from 'zss/device/vm/boardrunnermanagement'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'
import { ispresent } from 'zss/mapping/types'
import { memoryreadbookgadgetlayersforboard } from 'zss/memory/gadgetlayersflags'
import {
  memorymoveplayertoboard,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import {
  memoryreadgadgetlayers,
  memoryreadgraphics,
} from 'zss/memory/rendering'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import type { PT } from 'zss/words/types'

/** Apply a resolved player board move on the VM (runner handoff + layer rebuild). */
export function applyplayermovetoboard(
  vm: DEVICE,
  messageplayer: string,
  targetplayer: string,
  targetboard: string,
  targetpt: PT,
): boolean {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const currentboard = memoryreadplayerboard(targetplayer)
  let moved = false

  if (
    ispresent(currentboard) &&
    memorymoveplayertoboard(mainbook, targetplayer, targetboard, targetpt)
  ) {
    moved = true
    if (!boardrunnerassignmentvalid(currentboard.id)) {
      boardrunnerelect(currentboard.id)
    }
    if (boardrunnerassignmentvalid(targetboard)) {
      boardrunneridle(vm, targetplayer, targetboard)
    } else {
      boardrunnerassign(targetboard, targetplayer)
    }
  } else {
    boardrunnerthud(vm, messageplayer, targetplayer)
  }

  boardrunnerpushupdates(vm)

  const destboard = memoryreadplayerboard(targetplayer)
  if (moved && ispresent(destboard) && ispresent(mainbook)) {
    const { graphics } = memoryreadgraphics(targetplayer, destboard)
    const mode = normalizelayerzvariant(graphics)
    const layerstore = memoryreadbookgadgetlayersforboard(
      mainbook,
      destboard.id,
    )
    // Host one-shot rebuild: close runner desync gap so gadgetsynctick does not
    // serve leave-cell sprites while the worker waits on forcedesync.
    layerstore[mode] = memoryreadgadgetlayers(mode, destboard)
  }
  return moved
}

export function handleplayermovetoboard(vm: DEVICE, message: MESSAGE): void {
  const [targetplayer, targetboard, targetpt] = message.data as [
    string,
    string,
    PT,
  ]
  applyplayermovetoboard(
    vm,
    message.player,
    targetplayer,
    targetboard,
    targetpt,
  )
}
