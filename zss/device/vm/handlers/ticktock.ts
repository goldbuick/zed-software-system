import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
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

import { pilottick } from './pilot'

export function handleticktock(vm: DEVICE, _message: MESSAGE): void {
  void _message
  if (memoryreadsimfreeze()) {
    return
  }
  perfmeasure('vm:pilottick', () => {
    pilottick(vm)
  })
  perfmeasure('vm:memorytickmain', () => {
    memorytickmain(memoryreadhalt())
  })
  perfmeasure('vm:gadgetlayerscache', () => {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    if (!ispresent(mainbook)) {
      return
    }
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
}
