import type { DEVICE } from 'zss/device'
import { registerairsharepayload, workstatus } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/types'
import { compressedbookstate } from 'zss/device/vm/helpers'
import { memoryreadoperator } from 'zss/memory/session'

export function handleairshare(vm: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  const player = message.player || operator
  doasync(vm, player, async () => {
    workstatus(vm, player, 'airshare compress')
    const compressed = await compressedbookstate()
    registerairsharepayload(vm, player, compressed)
  })
}
