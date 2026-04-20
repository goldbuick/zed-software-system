import { createdevice } from 'zss/device'
import { memoryreadsession } from 'zss/memory/session'

import { platformready } from './api'
import { handledefault as vmdefaulthandler } from './vm/handlers/default'
import { handleuserinput } from './vm/handlers/input'
import { vmhandlers } from './vm/handlers/registry'
import { memorysyncensureregistered } from './vm/memorysync'

const vm = createdevice(
  'vm',
  ['ticktock', 'second'],
  (message) => {
    if (!vm.session(message)) {
      return
    }
    const handler = vmhandlers[message.target] ?? vmdefaulthandler
    handler(vm, message)
  },
  memoryreadsession(),
)

// server-side `user` device. user:* messages originate on the client (keyboard
// / gamepad / cli `#userinput`) and are fanned out to both the server and the
// elected boardrunner worker. the server half only needs to handle `input`
// for login bootstrap + lastinputtime; the per-player flags.inputqueue lives
// on the boardrunner worker (see boardrunneruser.ts). pilot:* is worker-only.
const user = createdevice('user', [], (message) => {
  if (!user.session(message)) {
    return
  }
  switch (message.target) {
    case 'input':
      handleuserinput(user, message)
      break
    default:
      break
  }
})

export function started() {
  memorysyncensureregistered()
  platformready(vm)
}
