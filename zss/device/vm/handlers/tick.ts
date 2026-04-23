import type { DEVICE } from 'zss/device'
import { type MESSAGE, boardrunnertick } from 'zss/device/api'
import {
  installboardrunner,
  pickboardrunnerwinner,
} from 'zss/device/vm/boardrunnerelection'
import { memorysyncpushdirty } from 'zss/device/vm/memorysimsync'
import {
  BOARDRUNNER_ACKTICK_STALE_MS,
  ackboardrunners,
  boardrunners,
  skipboardrunners,
  tracking,
} from 'zss/device/vm/state'
import { ispresent } from 'zss/mapping/types'
import {
  memoryreadplayerboard,
  memoryreadplayers,
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

  // validate state of boardrunners

  // first pass check last ack tick
  const timestamp = Date.now()
  activeboards.forEach((board) => {
    const lastacktick = ackboardrunners[board]
    if (ispresent(lastacktick)) {
      // track the last ack tick
      const delta = timestamp - ackboardrunners[board]
      if (delta > BOARDRUNNER_ACKTICK_STALE_MS) {
        // mark the player for skipping
        const player = boardrunners[board]
        skipboardrunners[player] = true
        // evict the boardrunner
        delete ackboardrunners[board]
        console.info('vm:tick evicting boardrunner', board, player)
      }
    }
  })

  // elect a new boardrunner if needed
  activeboards.forEach((board) => {
    const lastacktick = ackboardrunners[board]
    if (!ispresent(lastacktick)) {
      const winner = pickboardrunnerwinner(board)
      if (ispresent(winner)) {
        installboardrunner(vm, board, winner, timestamp)
      }
    }
  })
}
