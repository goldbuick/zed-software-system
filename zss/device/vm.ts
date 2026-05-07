import { createdevice } from 'zss/device'
import { memoryreadsession } from 'zss/memory/session'

import { platformready } from './api'
import { handledefault as vmdefaulthandler } from './vm/handlers/default'
import { vmhandlers } from './vm/handlers/registry'

const vm = createdevice(
  'vm',
  ['ticktock', 'second', 'boardrunnerack'],
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
