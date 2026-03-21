import { createdevice } from 'zss/device'
import { memoryreadsession } from 'zss/memory/session'

import { platformready } from './api'
import { vmdefaulthandler, vmhandlers } from './vm/handlers/registry'

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
