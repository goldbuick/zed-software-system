import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerpaint } from 'zss/device/api'
import type { Operation } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import { memoryboundaryget, memoryboundaryset } from 'zss/memory/boundaries'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'

type BOUNDARY_DOC = Record<string, any>

/** Apply worker-generated jsonpatch on the sim VM (canonical boundaries / root). */
export function handleboardrunnerpatch(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [patch, boundary] = message.data as [Operation[], string | undefined]
  if (boundary && isstring(boundary)) {
    const root = memoryboundaryget<BOUNDARY_DOC>(boundary) ?? {}
    const pipe = createjsonpipe(root, memoryrootshouldemitpath)
    const doc = pipe.applyremote(root, patch)
    if (ispresent(doc)) {
      memoryboundaryset(boundary, doc)
    } else {
      // push reset to the boardrunner boundary
      boardrunnerpaint(vm, message.player, root, boundary)
    }
  } else {
    // boardrunners CANNOT patch memoryroot
  }
}
