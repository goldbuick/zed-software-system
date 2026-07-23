import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { boardrunnerboundarypatch } from 'zss/device/vm/boardrunnerboundarysync'
import {
  boardrunneremitpatch,
  boardrunnermemorypatch,
} from 'zss/device/vm/boardrunnermemorysync'
import { decodepatchwire } from 'zss/feature/jsonpipe/wire'
import {
  markzedcafeexportfromboundaryops,
  markzedcafeexportfromrootops,
} from 'zss/feature/wanix/wanixstateexport'
import { isarray } from 'zss/mapping/types'

export function handleboardrunnerpatch(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  // we need to afford board runners to patch MAIN MEMORY
  const [patchwire, boundary] = message.data as [unknown, string | undefined]
  const operations = decodepatchwire(patchwire)

  if (boundary) {
    if (!boardrunnerboundarypatch(boundary, operations)) {
      // bad patch, send a reset — boardrunnerpaint recovery deferred
    } else {
      markzedcafeexportfromboundaryops(boundary, operations)
    }
  } else if (!boardrunnermemorypatch(operations)) {
    // bad patch, send a reset — boardrunnerpaint recovery deferred
  } else {
    markzedcafeexportfromrootops(operations)
    // emit patch to other board runners
    boardrunneremitpatch(vm, operations, message.player)
  }
}
