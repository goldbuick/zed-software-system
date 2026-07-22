import type { DEVICE } from 'zss/device'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/types'
import { forkstate } from 'zss/device/vm/helpers'
import { isstring } from 'zss/mapping/types'
import { memoryreadoperator } from 'zss/memory/session'

export function handlefork(vm: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  const transfer = isstring(message.data) ? message.data : ''
  doasync(vm, message.player, async () => {
    if (message.player === operator) {
      await forkstate(vm, transfer)
    } else {
      await forkstate(vm, transfer, message.player)
    }
  })
}
