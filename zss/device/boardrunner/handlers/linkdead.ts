import type { DEVICE } from 'zss/device'
import {
  apilog,
  boardrunneridle,
  registerloginready,
  vmclearscroll,
} from 'zss/device/api'
import { pushworkerupdates } from 'zss/device/boardrunner/sync'
import type { MESSAGE } from 'zss/device/types'
import { debugingest } from 'zss/debugingest'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memorydebugcountplayerboards,
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
    debugingest(
      'linkdead.ts:handlelinkdead',
      'linkdead early return no board',
      { player: linkdeadplayer },
      'H3',
    )
    return
  }

  debugingest(
    'linkdead.ts:handlelinkdead',
    'linkdead before logout',
    {
      player: linkdeadplayer,
      boardid: currentboard.id,
      ...memorydebugcountplayerboards(linkdeadplayer),
    },
    'H2',
  )

  // boot em out !
  memorylogoutplayer(linkdeadplayer)

  const after = memorydebugcountplayerboards(linkdeadplayer)
  debugingest(
    'linkdead.ts:handlelinkdead',
    'linkdead after logout',
    {
      player: linkdeadplayer,
      boardid: currentboard.id,
      count: after.count,
      boardids: after.boardids,
      flagsboard: after.flagsboard,
    },
    'H2',
  )

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
