import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { memorytickmain } from 'zss/memory/runtime'
import { memoryreadhalt, memoryreadsimfreeze } from 'zss/memory/session'
import { perfmeasure } from 'zss/perf/ui'

import { pilottick } from './pilot'

export function handletick(vm: DEVICE, _message: MESSAGE): void {
  void _message
  if (memoryreadsimfreeze()) {
    return
  }
  perfmeasure('vm:pilottick', () => {
    pilottick(vm)
  })
  perfmeasure('vm:memorytickmain', () => {
    memorytickmain(memoryreadhalt())
  })
}
