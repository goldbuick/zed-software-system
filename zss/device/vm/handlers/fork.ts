import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { forkstate } from 'zss/device/vm/helpers'
import { doasync } from 'zss/mapping/func'
import { memoryreadoperator } from 'zss/memory/session'

export function handlefork(vm: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  if (message.player !== operator) {
    return
  }
  doasync(vm, message.player, async () => {
    await forkstate(vm, message.data)
  })
}
