import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryrepeatclilast, memoryruncli } from 'zss/memory/runtime'

export function handlecli(_vm: DEVICE, message: MESSAGE): void {
  if (!isstring(message.player) || !isstring(message.data)) {
    return
  }
  memoryruncli(message.player, message.data)
}

export function handleclirepeatlast(_vm: DEVICE, message: MESSAGE): void {
  if (!ispresent(message.player)) {
    return
  }
  memoryrepeatclilast(message.player)
}
