import type { DEVICE } from 'zss/device'
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

// boardrunner-worker `user` device. counterpart to server-side user.ts.
//
// user:input — append [input, mods] to the worker-local MEMORY's
// flags[player].inputqueue so the next tick (run here on the worker) picks it
// up via element firmware. `flags.inputqueue` is stripped from the memory
// stream projection (VOLATILE_FLAG_KEYS in memoryproject.ts) so these writes
// stay worker-local and don't round-trip through the server.
//
// user:pilotstart / user:pilotstop / user:pilotclear — pilot state lives on
// this worker too; `pilottick` runs inside `runworkertick` and also pushes
// synthesized inputs onto the local inputqueue.
export function handleworkeruserinput(_dev: DEVICE, message: MESSAGE): void {
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
      handleworkeruserinput(user, message)
      break
    case 'pilotstart':
      handlepilotstart(user, message)
      break
    case 'pilotstop':
      handlepilotstop(user, message)
      break
    case 'pilotclear':
      handlepilotclear(user, message)
      break
    default:
      break
  }
})
