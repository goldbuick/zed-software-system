import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerboundarypatch } from 'zss/device/vm/boardrunnerboundarysync'
import type { Operation } from 'zss/feature/jsonpipe/observe'
import { isarray } from 'zss/mapping/types'

export function handleboardrunnerpatch(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [patch, boundary] = message.data as [Operation[], string | undefined]
  if (boundary) {
    boardrunnerboundarypatch(vm, message.player, boundary, patch)
  }
}
