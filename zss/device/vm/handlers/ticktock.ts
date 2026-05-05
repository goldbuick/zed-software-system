import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnertick } from 'zss/device/api'
import { pick } from 'zss/mapping/array'
import { TICK_FPS } from 'zss/mapping/tick'
import { ispresent } from 'zss/mapping/types'
import { memoryreadplayersonboard } from 'zss/memory/boardaccess'
import { memoryreadbookgadgetlayersmap } from 'zss/memory/gadgetlayersflags'
import { memoryreadbookplayerboards } from 'zss/memory/playermanagement'
import {
  memoryreadgadgetlayers,
  memoryreadgraphics,
} from 'zss/memory/rendering'
import { memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'
import { NAME } from 'zss/words/types'

import { boardrunneracks, boardrunnerblocked, boardrunners } from '../state'

import { pilottick } from './pilot'

const TICK_BUDGET = Math.ceil(TICK_FPS)

export function handleticktock(vm: DEVICE, _message: MESSAGE): void {
  void _message
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook) || memoryreadsimfreeze()) {
    return
  }
  perfmeasure('vm:pilottick', () => {
    pilottick(vm)
  })
  perfmeasure('vm:memorytickmain', () => {
    memorytickmain(memoryreadhalt())
  })
  perfmeasure('vm:gadgetlayerscache', () => {
    const store = memoryreadbookgadgetlayersmap(mainbook)
    const boards = memoryreadbookplayerboards(mainbook)
    const didrender: Record<string, boolean> = {}
    for (let b = 0; b < boards.length; ++b) {
      const board = boards[b]
      const players = memoryreadplayersonboard(board)
      for (let p = 0; p < players.length; ++p) {
        const player = players[p]
        const graphics = memoryreadgraphics(player, board)
        const mode = NAME(graphics.graphics)
        const cachename = `${mode}:${board.id}`
        if (!ispresent(didrender[cachename])) {
          didrender[cachename] = true
          store[cachename] = memoryreadgadgetlayers(mode, board)
        }
      }
    }
  })
  perfmeasure('vm:boardrunner', () => {
    const activeboards = memoryreadbookplayerboards(mainbook)
    for (let i = 0; i < activeboards.length; ++i) {
      const board = activeboards[i]
      const players = memoryreadplayersonboard(board)
      const eligible = players.filter((player) => !boardrunnerblocked[player])

      const priorrunner = boardrunners[board.id]
      if (ispresent(priorrunner) && !players.includes(priorrunner)) {
        delete boardrunners[board.id]
        delete boardrunneracks[priorrunner]
      }

      const currentrunner = boardrunners[board.id]
      if (ispresent(currentrunner)) {
        boardrunneracks[currentrunner] ??= TICK_BUDGET
        --boardrunneracks[currentrunner]
        if (boardrunneracks[currentrunner] < 1) {
          delete boardrunners[board.id]
          delete boardrunneracks[currentrunner]
          boardrunnerblocked[currentrunner] = true
        }
      }

      if (!ispresent(boardrunners[board.id]) && eligible.length > 0) {
        const elected = pick(...eligible)
        boardrunners[board.id] = elected
        boardrunneracks[elected] = TICK_BUDGET
      }

      const runner = boardrunners[board.id]
      if (ispresent(runner)) {
        boardrunnertick(vm, runner, board.id)
      }
    }
  })
}
