import type { DEVICE } from 'zss/device'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/types'
import { savebookmarkstate, savestate } from 'zss/device/vm/helpers'
import { memoryreadoperator } from 'zss/memory/session'

export function handleflush(vm: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  doasync(vm, message.player, async () => {
    if (message.player === operator) {
      await savestate(vm)
    } else {
      await savebookmarkstate(vm, message.player)
    }
  })
}
