import { createdevice } from 'zss/device'
import { INPUT } from 'zss/gadget/data/types'
import { isarray } from 'zss/mapping/types'
import { memoryhasflags, memoryreadflags } from 'zss/memory/flags'

import type { MESSAGE } from './api'
import {
  handlepilotclear,
  handlepilotstart,
  handlepilotstop,
} from './vm/handlers/pilot'

export function handleworkeruserinput(message: MESSAGE): void {
  if (!memoryhasflags(message.player)) {
    return
  }
  const flags = memoryreadflags(message.player)
  const [input = INPUT.NONE, mods = 0] = message.data ?? [INPUT.NONE, 0]
  if (!isarray(flags.inputqueue)) {
    flags.inputqueue = []
  }
  if (input !== INPUT.NONE) {
    flags.inputqueue.push([input, mods])
  }
}

const user = createdevice('user', [], (message) => {
  if (!user.session(message)) {
    return
  }
  switch (message.target) {
    case 'input':
      handleworkeruserinput(message)
      break
    case 'pilotstart':
      handlepilotstart(message)
      break
    case 'pilotstop':
      handlepilotstop(message)
      break
    case 'pilotclear':
      handlepilotclear(message)
      break
    default:
      break
  }
})
