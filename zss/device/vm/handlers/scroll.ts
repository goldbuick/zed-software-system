import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apitoast } from 'zss/device/api'
import { romparse, romread, romscroll } from 'zss/feature/rom'
import { gadgetcheckqueue, gadgetstate } from 'zss/gadget/data/api'
import { gadgetapplyscrolllines } from 'zss/gadget/data/applyscrolllines'
import { ispresent, isstring } from 'zss/mapping/types'
import { memorymakeitscroll } from 'zss/memory/inspectionmakeit'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryunlockscroll } from 'zss/memory/runtime'

export function handleclearscroll(_vm: DEVICE, message: MESSAGE): void {
  const maybeboard = memoryreadplayerboard(message.player)
  if (ispresent(maybeboard)) {
    const objids = Object.keys(maybeboard.objects)
    for (let i = 0; i < objids.length; ++i) {
      memoryunlockscroll(objids[i], message.player)
    }
  }
}

export function handlemakeitscroll(_vm: DEVICE, message: MESSAGE): void {
  if (typeof message.data === 'string') {
    memorymakeitscroll(message.data, message.player)
  }
}

export function handlerefscroll(_vm: DEVICE, message: MESSAGE): void {
  romparse(romread('refscroll:menu'), (line) => romscroll(message.player, line))
  const shared = gadgetstate(message.player)
  shared.scrollname = '#help or $meta+h'
  shared.scroll = gadgetcheckqueue(message.player)
}

export function handlegadgetscroll(vm: DEVICE, message: MESSAGE): void {
  const d = message.data as
    | { scrollname?: unknown; content?: unknown; chip?: unknown }
    | undefined
  if (!d || typeof d !== 'object') {
    apitoast(vm, message.player, 'gadget scroll: invalid payload')
    return
  }
  if (!isstring(d.scrollname) || !d.scrollname.trim()) {
    apitoast(vm, message.player, 'gadget scroll: need title')
    return
  }
  if (!isstring(d.content) || !d.content.trim()) {
    apitoast(vm, message.player, 'gadget scroll: need content')
    return
  }
  if (d.chip !== undefined && !isstring(d.chip)) {
    apitoast(vm, message.player, 'gadget scroll: invalid chip')
    return
  }
  const chip = isstring(d.chip) && d.chip.trim() ? d.chip.trim() : 'refscroll'
  try {
    gadgetapplyscrolllines(
      message.player,
      d.scrollname.trim(),
      d.content.trim(),
      chip,
    )
  } catch {
    apitoast(vm, message.player, 'gadget scroll failed')
  }
}
