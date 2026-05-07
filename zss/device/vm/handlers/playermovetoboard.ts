import type { DEVICE } from 'zss/device'
import { type MESSAGE, boardrunneridle, boardrunnerthud } from 'zss/device/api'
import {
  boardrunnerassign,
  boardrunnerassignmentvalid,
  boardrunnerelect,
  boardrunnerevict,
} from 'zss/device/vm/boardrunnermanagement'
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

  // attempt to move the player to the destination board
  if (memorymoveplayertoboard(mainbook, targetplayer, board, dest)) {
    // check dest board to see if there's a valid runner
    if (boardrunnerassignmentvalid(board)) {
      // send a message to the target player's runner that it is idle now
      boardrunneridle(vm, targetplayer)
    } else {
      // elect a new runner for the prior board
      if (ispresent(currentboard)) {
        boardrunnerevict(currentboard.id)
        boardrunnerelect(currentboard.id)
      }
      // switch assignment directly to the target player
      boardrunnerassign(board, targetplayer)
    }
  } else {
    // send a thud message back to the board runner
    boardrunnerthud(vm, message.player, targetplayer)
  }
}
