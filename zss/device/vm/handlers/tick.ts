import type { DEVICE } from 'zss/device'
import { type MESSAGE, boardrunnerowned, boardrunnertick } from 'zss/device/api'
import {
  ensureboardrunnerelected,
  revokeboardrunnerassignment,
} from 'zss/device/vm/boardrunnerelection'
import { memorypushsimsyncdirty } from 'zss/device/vm/memorysimsync'
import {
  BOARDRUNNER_ACKTICK_STALE_MS,
  ackboardrunners,
  boardrunners,
  skipboardrunners,
} from 'zss/device/vm/state'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadplayerboard,
  memoryreadplayers,
} from 'zss/memory/playermanagement'
import { memorytickloaders } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadfreeze,
  memoryreadoperator,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

export function handletick(vm: DEVICE, _message: MESSAGE): void {
  void _message
  // bail if the main book is not frozen or not present
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (memoryreadfreeze() || !ispresent(mainbook)) {
    return
  }

  perfmeasure('vm:memorytickloaders', () => {
    boardrunnertick(vm, memoryreadoperator(), memorytickloaders())
  })

  // determine boardrunner ownership
  const players = memoryreadplayers()

  // collect active boards
  const activeboards = new Set<string>()
  for (let i = 0; i < players.length; ++i) {
    const player = players[i]
    const board = memoryreadplayerboard(player)
    if (ispresent(board)) {
      activeboards.add(board.id)
    }
  }

  const timestamp = Date.now()
  activeboards.forEach((board) => {
    const lastacktick = ackboardrunners[board]
    if (ispresent(lastacktick)) {
      const delta = timestamp - lastacktick
      if (delta > BOARDRUNNER_ACKTICK_STALE_MS) {
        const staleplayer = boardrunners[board]
        if (isstring(staleplayer)) {
          // block from being elected again
          skipboardrunners[staleplayer] = true
          // revoke the boardrunner assignment
          revokeboardrunnerassignment(board)
          // signal that we are no longer running the board
          memorypushsimsyncdirty()
          boardrunnerowned(vm, staleplayer, '', [])
        }
      }
    }
  })

  activeboards.forEach((board) => {
    ensureboardrunnerelected(vm, board, timestamp)
  })

  // flush the dirty state to rxdb
  perfmeasure('vm:memorysyncpushdirty', () => {
    memorypushsimsyncdirty()
  })
}
