import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { memorytickmain } from 'zss/memory/runtime'
import { memoryreadhalt, memoryreadsimfreeze } from 'zss/memory/session'

import { pilottick } from './pilot'

export function handletick(vm: DEVICE, _message: MESSAGE): void {
  void _message
  if (memoryreadsimfreeze()) {
    return
  }
  pilottick(vm)
  memorytickmain(memoryreadhalt())
}
