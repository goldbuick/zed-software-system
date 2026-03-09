import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { doasync } from 'zss/mapping/func'
import { memoryreadoperator } from 'zss/memory/session'

import { savestate } from '../helpers'

export function handleflush(vm: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  if (message.player !== operator) {
    return
  }
  doasync(vm, message.player, async () => {
    await savestate(vm)
  })
}
