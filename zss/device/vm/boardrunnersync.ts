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

// since we send this to ALL boardrunners we only need ONE pipe
const boardrunnermemorypipe = createjsonpipe<MEMORY_ROOT>(
  memoryreadroot(),
  memoryrootshouldemitpath,
)

/** Push MEMORY snapshot deltas to boardrunner workers (activelist), jsonpipe v1. */
export function boardrunnermemorysync(vm: DEVICE) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const patch = boardrunnermemorypipe.emitdiff(memoryreadroot())
  if (patch.length > 0) {
    boardrunnerpatch(vm, memoryreadoperator(), patch)
  }
}

// boundary jsonpipes will go here
