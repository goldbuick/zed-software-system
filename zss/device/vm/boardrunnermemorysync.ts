import type { DEVICE } from 'zss/device'
import { boardrunnerpatch } from 'zss/device/api'
import { Operation, createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import {
  type MEMORY_ROOT,
  memoryreadbookbysoftware,
  memoryreadroot,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { measurestage, recordemitdiff } from 'zss/perf/ticktimingstats'

import { boardrunners } from './state'

const boardrunnermemorypipe = createjsonpipe<MEMORY_ROOT>(
  memoryreadroot(),
  memoryrootshouldemitpath,
)

function boardrunneremitpatch(
  vm: DEVICE,
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
      boardrunnerpatch(vm, player, operations, boundary)
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
  console.error(`${self.name} $$$ MEM PATCH\n`, operations)
  const root = memoryreadroot()
  const doc = boardrunnermemorypipe.applyremote(memoryreadroot(), operations)
  // ignore bad patch
  if (!ispresent(doc)) {
    boardrunnermemorypipe.cleardesync()
    console.error(`MEM`, deepcopy(root))
    return false
  }
  // keep root memory reference and apply props to root
  Object.assign(root, doc)
  console.info(`MEM`, deepcopy(root))
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
