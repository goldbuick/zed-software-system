import type { DEVICE } from 'zss/device'
import { type MESSAGE, boardrunnerjsondiffsync } from 'zss/device/api'
import { jsondiffsync } from 'zss/device/vm/state'
import {
  hubprepareoutboundforleaf,
  jsondiffsynchubapply,
} from 'zss/feature/jsondiffsync/hub'
import { memoryreadactivelist } from 'zss/memory/playermanagement'
import { memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadhalt,
  memoryreadroot,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { perfmeasure } from 'zss/perf/ui'

import { pilottick } from './pilot'

export function handleticktock(vm: DEVICE, _message: MESSAGE): void {
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
  perfmeasure('vm:jsondiffsync', () => {
    // build the outbound sync message
    if (jsondiffsynchubapply(jsondiffsync, memoryreadroot())) {
      // send outbound sync message to all active players
      const activelist = memoryreadactivelist()
      for (let i = 0; i < activelist.length; ++i) {
        const player = activelist[i]
        const prep = hubprepareoutboundforleaf(jsondiffsync, player)
        if (prep.message !== undefined) {
          boardrunnerjsondiffsync(vm, player, prep.message)
        }
      }
    }
  })
}
