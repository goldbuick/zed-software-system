import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { memorytickmain } from 'zss/memory/runtime'
import { memoryreadhalt } from 'zss/memory/session'

export function handleTick(_vm: DEVICE, _message: MESSAGE): void {
  void _vm
  void _message
  memorytickmain(memoryreadhalt())
}
