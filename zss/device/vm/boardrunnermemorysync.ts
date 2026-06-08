import type { DEVICE } from 'zss/device'
import { boardrunnerpatch } from 'zss/device/api'
import { Operation, createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { ispresent } from 'zss/mapping/types'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import {
  type MEMORY_ROOT,
  memoryreadbookbysoftware,
  memoryreadroot,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { tracehostmemorypatch } from 'zss/testsupport/hostmemorytrace'
import { measurestage, recordemitdiff } from 'zss/perf/ticktimingstats'

import { boardrunners } from './state'

const boardrunnermemorypipe = createjsonpipe<MEMORY_ROOT>(
  memoryreadroot(),
  memoryrootshouldemitpath,
)

export function boardrunneremitpatch(
  device: DEVICE,
  operations: Operation[],
  skipplayer: string,
  boundary?: string,
) {
  if (operations.length === 0) {
    return
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  let emits = 0
  const runners = Object.values(boardrunners)
  for (const player of mainbook.activelist) {
    if (runners.includes(player) && player !== skipplayer) {
      emits += 1
      boardrunnerpatch(device, player, operations, boundary)
    }
  }
  recordemitdiff(
    'vm:memorysync',
    operations.length,
    mainbook.activelist.length,
    emits,
  )
}

export function boardrunnermemorypatch(operations: Operation[]) {
  const root = memoryreadroot()
  const doc = boardrunnermemorypipe.applyremote(memoryreadroot(), operations)
  // ignore bad patch
  if (!ispresent(doc)) {
    boardrunnermemorypipe.cleardesync()
    // #region agent log
    tracehostmemorypatch('', operations.length, false, '', operations)
    // #endregion
    return false
  }
  // keep root memory reference and apply props to root
  Object.assign(root, doc)
  // #region agent log
  tracehostmemorypatch('', operations.length, true, '', operations)
  // #endregion
  return true
}

export function boardrunnermemorysync(vm: DEVICE) {
  const root = memoryreadroot()
  const operations = measurestage('vm:boardrunnermemorysync', () =>
    boardrunnermemorypipe.emitdiff(root),
  )
  // emit patch to all board runners
  boardrunneremitpatch(vm, operations, '')
}
