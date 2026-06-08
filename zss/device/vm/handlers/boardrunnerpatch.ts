import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerboundarypatch } from 'zss/device/vm/boardrunnerboundarysync'
import {
  boardrunneremitpatch,
  boardrunnermemorypatch,
} from 'zss/device/vm/boardrunnermemorysync'
import { gadgetsynctick } from 'zss/device/vm/gadgetsynctick'
import type { Operation } from 'zss/feature/jsonpipe/observe'
import { isarray } from 'zss/mapping/types'
import {
  ishostmemorytraceenabled,
  tracehostmemory,
} from 'zss/testsupport/hostmemorytrace'

function isflatcharpatch(operations: Operation[]): boolean {
  for (let i = 0; i < operations.length; ++i) {
    const path = String((operations[i] as { path?: string }).path ?? '')
    if (path.includes('/flat/layers') && path.includes('/char')) {
      return true
    }
  }
  return false
}

export function handleboardrunnerpatch(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  // we need to afford board runners to patch MAIN MEMORY
  const [operations, boundary] = message.data as [
    Operation[],
    string | undefined,
  ]
  if (boundary) {
    const applied = boardrunnerboundarypatch(boundary, operations)
    if (!applied) {
      // bad patch, send a reset — boardrunnerpaint recovery deferred
    } else if (isflatcharpatch(operations)) {
      // #region agent log
      if (ishostmemorytraceenabled()) {
        tracehostmemory('host:gadget:resync', 'H17', '', undefined, {
          source: 'flatcharpatch',
          boundary,
          opcount: operations.length,
        })
      }
      // #endregion
      gadgetsynctick(vm)
    }
  } else if (!boardrunnermemorypatch(operations)) {
    // bad patch, send a reset — boardrunnerpaint recovery deferred
  } else {
    // emit patch to other board runners
    boardrunneremitpatch(vm, operations, message.player)
  }
}
