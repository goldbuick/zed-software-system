import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { memoryrepeatclilast, memoryruncli } from 'zss/memory/runtime'

export function handleCli(_vm: DEVICE, message: MESSAGE): void {
  memoryruncli(message.player, message.data)
}

export function handleClirepeatlast(_vm: DEVICE, message: MESSAGE): void {
  memoryrepeatclilast(message.player)
}
