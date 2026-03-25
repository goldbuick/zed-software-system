import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import { storagewriteconfig } from 'zss/feature/storage'
import { doasync } from 'zss/mapping/func'
import {
  memoryreadhalt,
  memoryreadoperator,
  memorywritehalt,
} from 'zss/memory/session'
import { memorywriteconfig } from 'zss/memory/utilities'

export function handlehalt(vm: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  if (message.player !== operator) {
    return
  }
  const halt = memoryreadhalt() ? false : true
  memorywritehalt(halt)
  apilog(vm, message.player, `#dev mode is ${halt ? '$greenon' : '$redoff'}`)
  const devval = halt ? 'on' : 'off'
  doasync(vm, message.player, async () => {
    await storagewriteconfig('dev', devval)
    memorywriteconfig('dev', devval)
  })
}
