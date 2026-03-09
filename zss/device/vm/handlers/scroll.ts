import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { romparse, romread, romscroll } from 'zss/feature/rom'
import { gadgetcheckqueue, gadgetstate } from 'zss/gadget/data/api'
import { ispresent } from 'zss/mapping/types'
import { memorymakeitscroll } from 'zss/memory/inspectionmakeit'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryunlockscroll } from 'zss/memory/runtime'

export function handleClearscroll(_vm: DEVICE, message: MESSAGE): void {
  const maybeboard = memoryreadplayerboard(message.player)
  if (ispresent(maybeboard)) {
    const objids = Object.keys(maybeboard.objects)
    for (let i = 0; i < objids.length; ++i) {
      memoryunlockscroll(objids[i], message.player)
    }
  }
}

export function handleMakeitscroll(_vm: DEVICE, message: MESSAGE): void {
  if (typeof message.data === 'string') {
    memorymakeitscroll(message.data, message.player)
  }
}

export function handleRefscroll(_vm: DEVICE, message: MESSAGE): void {
  romparse(romread('refscroll:menu'), (line) => romscroll(message.player, line))
  const shared = gadgetstate(message.player)
  shared.scrollname = '#help or $meta+h'
  shared.scroll = gadgetcheckqueue(message.player)
}
