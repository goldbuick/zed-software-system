import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { gadgetsynctick } from 'zss/device/vm/gadgetsynctick'
import { memoryfsvmcheckontick } from 'zss/device/vm/handlers/memoryfs'
import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'
import { ispresent } from 'zss/mapping/types'
import { memoryreadplayersonboard } from 'zss/memory/boardaccess'
import { memoryreadbookgadgetlayersforboard } from 'zss/memory/gadgetlayersflags'
import { memoryreadbookplayerboards } from 'zss/memory/playermanagement'
import {
  memoryreadgadgetlayers,
  memoryreadgraphics,
} from 'zss/memory/rendering'
import { memorytickloaders, memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadfrozen,
  memoryreadhalt,
} from 'zss/memory/session'
import type { BOARD, BOOK } from 'zss/memory/types'
import { MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

/** Rebuild per-board gadget layer caches before gadgetsynctick reads them. */
function rebuildgadgetlayers(mainbook: BOOK, boards: BOARD[]) {
  const didrender: Record<string, boolean> = {}
  for (let b = 0; b < boards.length; ++b) {
    const board = boards[b]
    const store = memoryreadbookgadgetlayersforboard(mainbook, board.id)
    const players = memoryreadplayersonboard(board)
    for (let p = 0; p < players.length; ++p) {
      const { graphics } = memoryreadgraphics(players[p], board)
      const mode = normalizelayerzvariant(graphics)
      if (!ispresent(didrender[`${board.id}:${mode}`])) {
        didrender[`${board.id}:${mode}`] = true
        store[mode] = memoryreadgadgetlayers(mode, board)
      }
    }
  }
}

export function handleticktock(vm: DEVICE, _message: MESSAGE): void {
  void _message
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (ispresent(mainbook) && !memoryreadfrozen()) {
    perfmeasure('vm:memorytickloaders', () => {
      memorytickloaders()
    })
    // Pre-tick boards drive sim; mid-tick #goto / edge exits can move players.
    const boards = memoryreadbookplayerboards(mainbook)
    // Pass halt into playeronly (name/usage drift preserved from boardrunner path).
    perfmeasure('vm:memorytickmain', () => {
      memorytickmain(mainbook.timestamp, boards, memoryreadhalt())
    })
    // Rebuild from post-tick boards so dest boards get layers before gadgetsynctick
    // (pre-tick snapshot misses dest and triggers void-fallback flashes of old content).
    perfmeasure('vm:gadgetlayerscache', () => {
      rebuildgadgetlayers(mainbook, memoryreadbookplayerboards(mainbook))
    })
    perfmeasure('vm:gadgetsynctick', () => {
      gadgetsynctick(vm)
    })
    perfmeasure('vm:memoryfs', () => {
      memoryfsvmcheckontick(vm)
    })
  }
}
