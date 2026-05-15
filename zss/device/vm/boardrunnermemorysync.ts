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
import { measurestage, recordemitdiff } from 'zss/perf/ticktimingstats'

import { boardrunners } from './state'

const boardrunnermemorypipe = createjsonpipe<MEMORY_ROOT>(
  memoryreadroot(),
  memoryrootshouldemitpath,
)

export function boardrunnermemorysync(vm: DEVICE) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const patch = measurestage('vm:memorysync:emitdiff', () =>
    boardrunnermemorypipe.emitdiff(memoryreadroot()),
  )
  if (patch.length === 0) {
    return
  }
  // narrow recipients to players actually assigned to a runner board.
  // operator is always included so the UI on main stays in sync.
  const recipients = new Set<string>([memoryreadoperator()])
  const runnerplayers = Object.values(boardrunners)
  for (let i = 0; i < runnerplayers.length; ++i) {
    const player = runnerplayers[i]
    if (player) {
      recipients.add(player)
    }
  }
  let emits = 0
  for (const player of recipients) {
    if (!player) {
      continue
    }
    boardrunnerpatch(vm, player, patch)
    emits += 1
  }
  recordemitdiff('vm:memorysync', patch.length, recipients.size, emits)
}
