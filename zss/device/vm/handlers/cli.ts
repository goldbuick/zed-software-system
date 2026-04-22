import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { memoryrepeatclilast, memoryruncli } from 'zss/memory/runtime'

export function handlecli(_vm: DEVICE, message: MESSAGE): void {
  memoryruncli(message.player, message.data)
}

export function handleclirepeatlast(_vm: DEVICE, message: MESSAGE): void {
  memoryrepeatclilast(message.player)
}
