import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { registerpublishmem } from 'zss/device/api'
import { compressedbookstate } from 'zss/device/vm/helpers'
import { doasync } from 'zss/mapping/func'
import { isarray } from 'zss/mapping/types'
import { memoryreadoperator } from 'zss/memory/session'

export function handlepublish(vm: DEVICE, message: MESSAGE): void {
  doasync(vm, message.player, async () => {
    const operator = memoryreadoperator()
    if (message.player !== operator || !isarray(message.data)) {
      return
    }
    const content = await compressedbookstate()
    registerpublishmem(vm, message.player, content, ...message.data)
  })
}
