import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import {
  memoryreadboardrunner,
  memorywriteboardrunner,
} from 'zss/memory/session'
export function handlestart(_device: DEVICE, message: MESSAGE): void {
  if (!memoryreadboardrunner()) {
    memorywriteboardrunner(message.player)
  }
}
