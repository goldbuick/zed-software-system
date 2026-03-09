import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { doasync } from 'zss/mapping/func'
import { isarray } from 'zss/mapping/types'
import { memoryinspect } from 'zss/memory/inspection'
import { memoryfindanymenu } from 'zss/memory/inspectionfind'
import type { PT } from 'zss/words/types'
export function handleinspect(vm: DEVICE, message: MESSAGE): void {
  doasync(vm, message.player, async () => {
    if (isarray(message.data)) {
      const [p1, p2] = message.data as [PT, PT]
      await memoryinspect(message.player, p1, p2)
    }
  })
}

export function handlefindany(vm: DEVICE, message: MESSAGE): void {
  doasync(vm, message.player, async () => {
    await memoryfindanymenu(message.player)
  })
}
