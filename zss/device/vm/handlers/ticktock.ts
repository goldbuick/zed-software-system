import type { DEVICE } from 'zss/device'
import { type MESSAGE, boardrunnertick } from 'zss/device/api'
import { boardrunnerboundarymemorysync } from 'zss/device/vm/boardrunnerboundarysync'
import {
  boardrunnerassignmentvalid,
  boardrunnerblock,
  boardrunnerbudgetdec,
  boardrunnerelect,
  boardrunnerevict,
} from 'zss/device/vm/boardrunnermanagement'
import { boardrunnermemorysync } from 'zss/device/vm/boardrunnermemorysync'
import { gadgetsynctick } from 'zss/device/vm/gadgetsynctick'
import { boardrunners } from 'zss/device/vm/state'
import { ispresent } from 'zss/mapping/types'
import { memoryreadplayersonboard } from 'zss/memory/boardaccess'
import { memoryreadbookgadgetlayersforboard } from 'zss/memory/gadgetlayersflags'
import { memoryreadbookplayerboards } from 'zss/memory/playermanagement'
import {
  memoryreadgadgetlayers,
  memoryreadgraphics,
} from 'zss/memory/rendering'
import { memorytickloaders } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'
import { NAME } from 'zss/words/types'

import { pilottick } from './pilot'

export function handleticktock(vm: DEVICE, _message: MESSAGE): void {
  void _message
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook) || memoryreadsimfreeze()) {
    return
  }
  perfmeasure('vm:gadgetsynctick', () => {
    gadgetsynctick(vm)
  })
  perfmeasure('vm:pilottick', () => {
    pilottick(vm)
  })
  perfmeasure('vm:memorytickloaders', () => {
    memorytickloaders()
  })
  perfmeasure('vm:gadgetlayerscache', () => {
    const boards = memoryreadbookplayerboards(mainbook)
    for (let b = 0; b < boards.length; ++b) {
      const board = boards[b]
      const store = memoryreadbookgadgetlayersforboard(mainbook, board.id)
      const didrender: Record<string, boolean> = {}
      const players = memoryreadplayersonboard(board)
      for (let p = 0; p < players.length; ++p) {
        const player = players[p]
        const graphics = memoryreadgraphics(player, board)
        const mode = NAME(graphics.graphics)
        if (!ispresent(didrender[mode])) {
          didrender[mode] = true
          store[mode] = memoryreadgadgetlayers(mode, board)
        }
      }
    }
  })
  perfmeasure('vm:boardrunner', () => {
    const activeboards = memoryreadbookplayerboards(mainbook)
    for (let i = 0; i < activeboards.length; ++i) {
      const board = activeboards[i]
      const boardid = board.id

      // validate the current runner
      const currentrunner = boardrunners[boardid]
      if (boardrunnerassignmentvalid(boardid)) {
        // current runner is still on the board, check if we hit ack timeout
        if (boardrunnerbudgetdec(currentrunner)) {
          // we hit ack timeout
          boardrunnerblock(currentrunner)
          boardrunnerevict(boardid)
        }
      } else {
        // the current runner is no longer on the board
        boardrunnerevict(boardid)
      }

      // if no runner is assigned, elect a new one
      if (!boardrunners[boardid]) {
        boardrunnerelect(boardid)
      }
    }
  })
  perfmeasure('vm:boardrunnersync', () => {
    boardrunnermemorysync(vm)
    const boardboundaries = boardrunnerboundarymemorysync(vm)
    for (const board in boardboundaries) {
      const player = boardrunners[board]
      // signal tick to the boardrunner
      boardrunnertick(
        vm,
        player,
        board,
        mainbook.timestamp,
        boardboundaries[board],
      )
    }
  })
}
