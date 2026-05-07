import { MAYBE, ispresent } from 'zss/mapping/types'

import { memorydeleteboardelementruntime } from './runtimeboundary'
import { BOARD } from './types'

export function memoryfreeboardelementsruntime(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }
  for (let i = 0; i < board.terrain.length; ++i) {
    memorydeleteboardelementruntime(board.terrain[i])
  }
  const ids = Object.keys(board.objects)
  for (let i = 0; i < ids.length; ++i) {
    memorydeleteboardelementruntime(board.objects[ids[i]])
  }
}
