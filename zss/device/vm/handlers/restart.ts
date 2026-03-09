import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmflush } from 'zss/device/api'
import { memoryrestartallchipsandflags } from 'zss/memory/runtime'
import { memoryreadoperator } from 'zss/memory/session'

export function handlerestart(vm: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  if (message.player !== operator) {
    return
  }
  memoryrestartallchipsandflags()
  vmflush(vm, message.player)
}
