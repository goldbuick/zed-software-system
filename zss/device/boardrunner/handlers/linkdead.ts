import type { DEVICE } from 'zss/device'
import {
  type MESSAGE,
  apilog,
  boardrunneridle,
  registerloginready,
  vmclearscroll,
} from 'zss/device/api'
import { pushworkerupdates } from 'zss/device/boardrunner/sync'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memorylogoutplayer,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import { memoryreadboardrunner } from 'zss/memory/session'

export function handlelinkdead(device: DEVICE, message: MESSAGE): void {
  const linkdeadplayer = message.data
  if (!isstring(linkdeadplayer)) {
    return
  }

  // grab the current board the player is on
  const currentboard = memoryreadplayerboard(linkdeadplayer)
  if (!ispresent(currentboard)) {
    return
  }

  // boot em out !
  memorylogoutplayer(linkdeadplayer)

  // push jsonpipe changes
  pushworkerupdates(device)

  // if we are linkdeading ourself, invoke boardrunneridle
  if (linkdeadplayer === memoryreadboardrunner()) {
    boardrunneridle(device, linkdeadplayer, 'logout')
  }

  // clear player state
  vmclearscroll(device, linkdeadplayer)

  // signal logout
  apilog(device, linkdeadplayer, `player ${linkdeadplayer} logout`)
  registerloginready(device, linkdeadplayer)
}
