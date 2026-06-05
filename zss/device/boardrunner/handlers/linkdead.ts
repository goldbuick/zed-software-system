import type { DEVICE } from 'zss/device'
import {
  type MESSAGE,
  apilog,
  registerloginready,
  vmclearscroll,
} from 'zss/device/api'
import { pushworkerupdates } from 'zss/device/boardrunner/sync'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memorylogoutplayer,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'

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

  memorylogoutplayer(linkdeadplayer)

  // clear player state
  vmclearscroll(device, linkdeadplayer)

  // push jsonpipe changes
  pushworkerupdates(device)

  // signal logout
  apilog(device, linkdeadplayer, `player ${linkdeadplayer} logout`)
  registerloginready(device, linkdeadplayer)
}
