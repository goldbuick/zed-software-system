import { createdevice } from 'zss/device'
import { memoryreadsession } from 'zss/memory/session'

import { platformready } from './api'
import { vmdefaulthandler, vmhandlers } from './vm/handlers/registry'
import { lastinputtime } from './vm/state'

const vm = createdevice(
  'vm',
  ['tick', 'second'],
  (message) => {
    if (!vm.session(message)) {
      return
    }
    const handler = vmhandlers[message.target] ?? vmdefaulthandler
    handler(vm, message)
  },
  memoryreadsession(),
)

export function started() {
  platformready(vm)
}

/** Last input timestamp (ms) for a player. Use for AFK: (Date.now() - ts) > threshold */
export function vmreadplayerlastinput(player: string): number | undefined {
  return lastinputtime[player]
}
