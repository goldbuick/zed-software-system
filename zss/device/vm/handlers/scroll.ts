import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apitoast } from 'zss/device/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadbookflag,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import { memorymakeitscroll } from 'zss/memory/inspectionmakeit'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { romread } from 'zss/rom'

export function handleclearscroll(_vm: DEVICE, message: MESSAGE): void {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const maybeboard = memoryreadplayerboard(message.player)
  if (!ispresent(mainbook) || !ispresent(maybeboard)) {
    return
  }
  const objids = Object.keys(maybeboard.objects)
  for (let i = 0; i < objids.length; ++i) {
    const objid = objids[i]
    const sk = memoryreadbookflag(mainbook, objid, 'sk')
    if (sk === message.player) {
      memorywritebookflag(mainbook, objid, 'sk', '')
    }
  }
}

export function handlemakeitscroll(_vm: DEVICE, message: MESSAGE): void {
  if (typeof message.data === 'string') {
    memorymakeitscroll(message.data, message.player)
  }
}

export function handlerefscroll(vm: DEVICE, message: MESSAGE): void {
  const content = romread('refscroll:menu') ?? ''
  if (!content.trim()) {
    apitoast(vm, message.player, 'gadget scroll: need content')
    return
  }
  // refscroll:menu is Zed !command;label lines (readable next to other built-in scroll strings).
  scrollwritelines(
    message.player,
    '#help or $meta+h',
    content.trim(),
    'refscroll',
  )
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
    scrollwritelines(
      message.player,
      d.scrollname.trim(),
      d.content.trim(),
      chip,
    )
  } catch {
    apitoast(vm, message.player, 'gadget scroll failed')
  }
}
