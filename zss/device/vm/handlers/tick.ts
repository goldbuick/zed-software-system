import type { DEVICE } from 'zss/device'
import { type MESSAGE, boardrunnerowned, boardrunnertick } from 'zss/device/api'
import {
  memorysyncadmitboardrunner,
  memorysyncpushdirty,
  memorysyncrevokeboardrunner,
} from 'zss/device/vm/memorysimsync'
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
      // elect a new boardrunner
      const players = memoryreadplayersfromboard(board)
      // filter players by skip then sort players by tracking score
      const [winner] = players
        .filter((player) => !skipboardrunners[player])
        .sort((a, b) => tracking[b] - tracking[a])
      // set the boardrunner
      if (ispresent(winner)) {
        // revoke the previous boardrunner
        const previous = boardrunners[board]
        if (ispresent(previous)) {
          memorysyncrevokeboardrunner(previous, board)
          // signal the previous boardrunner
          boardrunnerowned(vm, previous, '')
        }
        // admit the new boardrunner
        boardrunners[board] = winner
        ackboardrunners[board] = timestamp
        memorysyncadmitboardrunner(winner, board)
        // signal the boardrunner
        boardrunnerowned(vm, winner, board)
      }
    }
  })
}
