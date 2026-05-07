import type { DEVICE } from 'zss/device'
import { boardrunnerpatch } from 'zss/device/api'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { ispresent } from 'zss/mapping/types'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import {
  type MEMORY_ROOT,
  memoryreadbookbysoftware,
  memoryreadoperator,
  memoryreadroot,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

const boardrunnermemorypipe = createjsonpipe<MEMORY_ROOT>(
  memoryreadroot(),
  memoryrootshouldemitpath,
)

export function boardrunnermemorysync(vm: DEVICE, showlog = false) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const patch = boardrunnermemorypipe.emitdiff(memoryreadroot())
  if (patch.length > 0) {
    const activelist = new Set<string>([
      memoryreadoperator(),
      ...(mainbook.activelist ?? []),
    ])
    for (const player of activelist) {
      boardrunnerpatch(vm, player, patch)
      if (showlog) {
        console.info('boardrunnermemorysync', player, patch)
      }
    }
  }
}
