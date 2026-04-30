import { createdevice } from 'zss/device'
import { memoryreadsession } from 'zss/memory/session'

import { platformready } from './api'
import { handledefault } from './vm/handlers/default'
import { vmhandlers } from './vm/handlers/registry'

export const vm = createdevice(
  'vm',
  ['ticktock', 'second'],
  (message) => {
    if (!vm.session(message)) {
      return
    }
    const handler = vmhandlers[message.target] ?? handledefault
    handler(vm, message)
  },
  memoryreadsession(),
)

export function started() {
  platformready(vm)
}
