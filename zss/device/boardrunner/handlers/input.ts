import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  assignedboundaries,
  playersonassignedboard,
  readworkerboundarypipe,
} from 'zss/device/boardrunner/state'
import { pushworkerupdates, waitformemory } from 'zss/device/boardrunner/sync'
import { INPUT } from 'zss/gadget/data/types'
import { isarray, ispresent } from 'zss/mapping/types'
import { memoryboundaryget } from 'zss/memory/boundaries'
import { memoryreadflags } from 'zss/memory/flags'
import { memoryreadassignedboard } from 'zss/memory/session'
import { CODE_PAGE_RUNTIME } from 'zss/memory/types'

export function handleinput(device: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  if (waitformemory() || !playersonassignedboard.has(message.player)) {
    return
  }

  const runtime = memoryboundaryget<CODE_PAGE_RUNTIME>(
    memoryreadassignedboard(),
  )
  if (!ispresent(runtime?.board)) {
    return
  }

  for (const id of assignedboundaries.values()) {
    if (readworkerboundarypipe(id).isdesynced()) {
      return
    }
  }

  const flags = memoryreadflags(message.player)
  const [input = INPUT.NONE, mods = 0] = message.data ?? [INPUT.NONE, 0]
  if (!isarray(flags.inputqueue)) {
    flags.inputqueue = []
  }
  if (input !== INPUT.NONE) {
    flags.inputqueue.push([input, mods])
  }

  pushworkerupdates(device)
}
