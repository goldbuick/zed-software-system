import type { DEVICE } from 'zss/device'
import { type MESSAGE, boardrunneridle, boardrunnerthud } from 'zss/device/api'
import {
  boardrunnerassign,
  boardrunnerassignmentvalid,
  boardrunnerelect,
} from 'zss/device/vm/boardrunnermanagement'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import { ispresent } from 'zss/mapping/types'
import {
  memorymoveplayertoboard,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import type { PT } from 'zss/words/types'

export function handleplayermovetoboard(vm: DEVICE, message: MESSAGE): void {
  const [targetplayer, board, dest] = message.data as [string, string, PT]
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const currentboard = memoryreadplayerboard(targetplayer)
  if (!ispresent(currentboard)) {
    return
  }

  // attempt to move the player to the destination board
  if (memorymoveplayertoboard(mainbook, targetplayer, board, dest)) {
    // send a message to the target player's runner that it is idle now
    boardrunneridle(vm, targetplayer)
    // elect a new runner for the prior board
    if (!boardrunnerassignmentvalid(currentboard.id)) {
      // elect a new runner for the prior board
      // its possible the prior board has no runners eligible
      boardrunnerelect(currentboard.id)
    }
    // check dest board to see if there's a valid runner
    if (boardrunnerassignmentvalid(board)) {
      // send a message to the target player's runner that it is idle now
      boardrunneridle(vm, targetplayer)
    } else {
      // switch assignment directly to the target player
      boardrunnerassign(board, targetplayer)
    }
  } else {
    // send a thud message back to the board runner
    boardrunnerthud(vm, message.player, targetplayer)
  }

  // push jsonpipe changes
  boardrunnerpushupdates(vm)
}
