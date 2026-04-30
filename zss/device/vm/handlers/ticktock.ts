import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  boardrunneracks,
  boardrunnerblocked,
  boardrunners,
} from 'zss/device/vm/state'
import { pick } from 'zss/mapping/array'
import { ispid } from 'zss/mapping/guid'
import { TICK_FPS } from 'zss/mapping/tick'
import { ispresent } from 'zss/mapping/types'
import {
  memoryreadbookplayerboards,
  memoryreadplayerboardaddress,
} from 'zss/memory/playermanagement'
import { memorytickloaders } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

import { boardrunnertick } from '../../api'

import { pilottick } from './pilot'

export function handleticktock(vm: DEVICE, _message: MESSAGE): void {
  void _message
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (memoryreadsimfreeze() || !ispresent(mainbook)) {
    return
  }
  pilottick(vm)
  memorytickloaders()
  const activeboards = memoryreadbookplayerboards(mainbook)
  for (let i = 0; i < activeboards.length; ++i) {
    const board = activeboards[i]
    if (ispresent(boardrunners[board.id])) {
      const runnerplayer = boardrunners[board.id]
      if (memoryreadplayerboardaddress(runnerplayer) !== board.id) {
        delete boardrunners[board.id]
        delete boardrunneracks[board.id]
      } else {
        boardrunneracks[runnerplayer]--
        if (boardrunneracks[runnerplayer] < 1) {
          delete boardrunners[board.id]
          delete boardrunneracks[board.id]
          boardrunnerblocked[runnerplayer] = true
        }
      }
    }
    if (!ispresent(boardrunners[board.id])) {
      const playersonboard = Object.keys(board.objects)
        .filter(ispid)
        .filter((player) => !boardrunnerblocked[player])
      const elected = pick(playersonboard)
      boardrunners[board.id] = elected
      boardrunneracks[elected] = Math.ceil(TICK_FPS)
    }
    if (ispresent(boardrunners[board.id])) {
      boardrunnertick(vm, boardrunners[board.id], board.id, mainbook.timestamp)
    }
  }
}
