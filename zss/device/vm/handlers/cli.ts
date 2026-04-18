import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryrepeatclilast, memoryruncli } from 'zss/memory/runtime'

export function handlecli(_vm: DEVICE, message: MESSAGE): void {
  if (!isstring(message.player) || !message.player) {
    return
  }
  const input = isstring(message.data) ? message.data : ''
  if (!input) {
    return
  }
  memoryruncli(message.player, input)
}

export function handleclirepeatlast(_vm: DEVICE, message: MESSAGE): void {
  if (!ispresent(message.player) || !message.player) {
    return
  }
  memoryrepeatclilast(message.player)
}
