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
import { memorytickloaders, memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { NAME } from 'zss/words/types'

import { pilottick } from './pilot'

export function handleticktock(vm: DEVICE, _message: MESSAGE): void {
  void _message
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (memoryreadsimfreeze() || !ispresent(mainbook)) {
    return
  }
  pilottick(vm)
  memorytickloaders()

  // update active boards
  const activeboards = memoryreadbookplayerboards(mainbook)
  for (let i = 0; i < activeboards.length; ++i) {
    const board = activeboards[i]
    // update
    memorytickmain(mainbook, board.id, memoryreadhalt())
    // render layers for the board
    const store = memoryreadbookgadgetlayersmap(mainbook)
    const localplayers = memoryreadplayersonboard(board)
    for (let j = 0; j < localplayers.length; ++j) {
      const player = localplayers[j]
      const graphics = memoryreadgraphics(player, board)
      const mode = NAME(graphics.graphics)
      const cachename = `${mode}:${board.id}`
      store[cachename] = memoryreadgadgetlayers(mode, board)
    }
  }
}
