import { createdevice } from 'zss/device'
import type { DEVICE } from 'zss/device'
import { memoryreadsession } from 'zss/memory/session'

import { platformready } from './api'
import { handledefault as vmdefaulthandler } from './vm/handlers/default'
import { vmhandlers } from './vm/handlers/registry'

let vm: DEVICE | undefined

function ensurevm(): DEVICE {
  vm ??= createdevice(
    'vm',
    ['ticktock', 'second', 'chip'],
    (message) => {
      if (!vm?.session(message)) {
        return
      }
      const handler = vmhandlers[message.target] ?? vmdefaulthandler
      handler(vm, message)
    },
    memoryreadsession(),
  )
  return vm
}

export function started() {
  platformready(ensurevm())
}
