import type { DEVICE } from 'zss/device'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/types'
import { savestate } from 'zss/device/vm/helpers'
import { memoryreadoperator } from 'zss/memory/session'

export function handleflush(vm: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  if (message.player !== operator) {
    return
  }
  doasync(vm, message.player, async () => {
    await savestate(vm)
  })
}
