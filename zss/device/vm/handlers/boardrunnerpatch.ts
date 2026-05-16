import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerboundarypatch } from 'zss/device/vm/boardrunnerboundarysync'
import { boardrunnermemorypatch } from 'zss/device/vm/boardrunnermemorysync'
import type { Operation } from 'zss/feature/jsonpipe/observe'
import { isarray } from 'zss/mapping/types'

export function handleboardrunnerpatch(_vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  // we need to afford board runners to patch MAIN MEMORY
  const [operations, boundary] = message.data as [
    Operation[],
    string | undefined,
  ]
  if (!boundary) {
    if (!boardrunnermemorypatch(operations)) {
      // bad patch, send a reset — boardrunnerpaint recovery deferred
    } else {
      // emit patch to other board runners
      boardrunnermemorypatch(operations)
    }
  } else if (!boardrunnerboundarypatch(boundary, operations)) {
    // bad patch, send a reset — boardrunnerpaint recovery deferred
  }
}

// NOTE: we keep getting multiple books when saving??
// consider pages: Record<string, PAGE> id => PAGE ??
