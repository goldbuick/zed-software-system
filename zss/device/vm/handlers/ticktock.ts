import type { DEVICE } from 'zss/device'
import { type MESSAGE, boardrunnertick } from 'zss/device/api'
import {
  boardrunnerassignmentvalid,
  boardrunnerblock,
  boardrunnerbudgetdec,
  boardrunnerelect,
  boardrunnerevict,
} from 'zss/device/vm/boardrunnermanagement'
import { gadgetsynctick } from 'zss/device/vm/gadgetsynctick'
import { boardrunners } from 'zss/device/vm/state'
import { ispresent } from 'zss/mapping/types'
import { memoryboundaryget } from 'zss/memory/boundaries'
import { memorycollectboundaryidsforboard } from 'zss/memory/boundaryrouting'
import { memoryreadbookplayerboards } from 'zss/memory/playermanagement'
import { memorytickloaders } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { CODE_PAGE_RUNTIME, MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

import { boardrunnerpushupdates } from '../boardrunnerpushupdates'

import { pilottick } from './pilot'

export function handleticktock(vm: DEVICE, _message: MESSAGE): void {
  void _message
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook) || memoryreadsimfreeze()) {
    return
  }
  perfmeasure('vm:pilottick', () => {
    pilottick(vm)
  })
  perfmeasure('vm:memorytickloaders', () => {
    memorytickloaders()
  })
  perfmeasure('vm:gadgetsynctick', () => {
    gadgetsynctick(vm)
  })
  // boardrunner management
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
  perfmeasure('vm:boardrunnerpushupdates', () => {
    boardrunnerpushupdates(vm)
  })
  perfmeasure('vm:boardrunnersendtick', () => {
    // signal tick to the boardrunners
    const ids = Object.keys(boardrunners)
    for (let i = 0; i < ids.length; ++i) {
      const board = ids[i]
      const player = boardrunners[board]
      // code page data shortcut
      const mayberuntime = memoryboundaryget<CODE_PAGE_RUNTIME>(board)
      // read board data to scan for boundary ids
      const boardboundaries = memorycollectboundaryidsforboard(
        mainbook,
        mayberuntime?.board,
      )
      // send tick to the boardrunner
      boardrunnertick(vm, player, board, mainbook.timestamp, boardboundaries)
    }
  })
}
