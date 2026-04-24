import type { DEVICE } from 'zss/device'
import { type MESSAGE, boardrunnertick } from 'zss/device/api'
import {
  ensureboardrunnerelected,
  revokeboardrunnerassignment,
} from 'zss/device/vm/boardrunnerelection'
import { memorysyncpushdirty } from 'zss/device/vm/memorysimsync'
import {
  BOARDRUNNER_ACKTICK_STALE_MS,
  ackboardrunners,
  boardrunners,
  skipboardrunners,
  tracking,
} from 'zss/device/vm/state'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadplayerboard,
  memoryreadplayers,
  memoryreadplayersfromboard,
  memoryscanplayers,
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
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (memoryreadfreeze() || !ispresent(mainbook)) {
    return
  }

  memoryscanplayers(tracking)

  perfmeasure('vm:memorytickloaders', () => {
    boardrunnertick(vm, memoryreadoperator(), memorytickloaders())
  })

  perfmeasure('vm:memorysyncpushdirty', () => {
    memorysyncpushdirty()
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
        if (isstring(staleplayer) && staleplayer) {
          skipboardrunners[staleplayer] = true
        }
        revokeboardrunnerassignment(vm, board)
      }
    }
  })

  activeboards.forEach((board) => {
    ensureboardrunnerelected(vm, board, timestamp)
  })
}
