import { debugingest } from 'zss/debugingest'
import type { DEVICE } from 'zss/device'
import { boardrunneridle, boardrunnerthud } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import {
  boardrunnerassign,
  boardrunnerassignmentvalid,
  boardrunnerelect,
} from 'zss/device/vm/boardrunnermanagement'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import type { LAYER } from 'zss/gadget/data/types'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'
import { ispresent } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardaccess'
import { memoryreadbookgadgetlayersforboard } from 'zss/memory/gadgetlayersflags'
import {
  memorydebugcountplayerboards,
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

function readplayerspritexyfromlayers(
  layers: LAYER[],
  player: string,
): { x: number; y: number } {
  for (let i = 0; i < layers.length; ++i) {
    const layer = layers[i]
    if (layer.type !== LAYER_TYPE.SPRITES) {
      continue
    }
    for (let s = 0; s < layer.sprites.length; ++s) {
      if (layer.sprites[s].pid === player) {
        return { x: layer.sprites[s].x, y: layer.sprites[s].y }
      }
    }
  }
  return { x: -1, y: -1 }
}

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
  const sourceboardid = currentboard?.id ?? ''
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

  const scan = memorydebugcountplayerboards(targetplayer)
  const destboard = memoryreadplayerboard(targetplayer)
  const hostobj = memoryreadobject(destboard, targetplayer)
  let destlayerstorepresent = false
  let hostrebuiltlayers = false
  let stalestorespritex = -1
  let stalestorespritey = -1
  if (moved && ispresent(destboard) && ispresent(mainbook)) {
    const { graphics } = memoryreadgraphics(targetplayer, destboard)
    const mode = normalizelayerzvariant(graphics)
    const layerstore = memoryreadbookgadgetlayersforboard(
      mainbook,
      destboard.id,
    )
    const stale = layerstore[mode]
    destlayerstorepresent = ispresent(stale)
    if (ispresent(stale)) {
      const xy = readplayerspritexyfromlayers(stale.layers, targetplayer)
      stalestorespritex = xy.x
      stalestorespritey = xy.y
    }
    // Host one-shot rebuild: close runner desync gap so gadgetsynctick does not
    // serve leave-cell sprites while the worker waits on forcedesync.
    layerstore[mode] = memoryreadgadgetlayers(mode, destboard)
    hostrebuiltlayers = true
    destlayerstorepresent = true
  }
  debugingest(
    'playermovetoboard.ts:handleplayermovetoboard',
    'host after move push',
    {
      player: targetplayer,
      sourceboardid,
      destboardid: targetboard,
      moved,
      count: scan.count,
      boardids: scan.boardids,
      flagsboard: scan.flagsboard,
      hostx: hostobj?.x ?? -1,
      hosty: hostobj?.y ?? -1,
      destlayerstorepresent,
      hostrebuiltlayers,
      stalestorespritex,
      stalestorespritey,
      stale:
        stalestorespritex !== -1 &&
        ispresent(hostobj) &&
        (stalestorespritex !== hostobj.x || stalestorespritey !== hostobj.y),
    },
    'BC1',
  )
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
