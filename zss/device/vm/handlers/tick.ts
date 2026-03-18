import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { memorytickmain } from 'zss/memory/runtime'
import { memoryreadhalt } from 'zss/memory/session'

import { pilottick } from './pilot'

export function handletick(vm: DEVICE, _message: MESSAGE): void {
  void _message
  pilottick(vm)
  memorytickmain(memoryreadhalt())
}
