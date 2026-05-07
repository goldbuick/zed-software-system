import type { DEVICE } from 'zss/device'
import { boardrunnerpatch } from 'zss/device/api'
import type { JSON_PIPE_HANDLE } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { ispresent } from 'zss/mapping/types'
import { memoryboundaryget } from 'zss/memory/boundaries'
import { memorycollectboundaryidsforboard } from 'zss/memory/boundaryrouting'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { CODE_PAGE_RUNTIME, MEMORY_LABEL } from 'zss/memory/types'

import { boardrunners } from './state'

type BOUNDARY_DOC = Record<string, any>
type BOUNDARY_JSONPIPE = JSON_PIPE_HANDLE<BOUNDARY_DOC>
const boundaryjsonpipes = new Map<string, BOUNDARY_JSONPIPE>()

function readboundarypipe(id: string, boundary: BOUNDARY_DOC) {
  if (boundaryjsonpipes.has(id)) {
    return boundaryjsonpipes.get(id)!
  }
  return createjsonpipe<BOUNDARY_DOC>(boundary, memoryrootshouldemitpath)
}

export function boardrunnerboundarymemorysync(
  vm: DEVICE,
  showlog = false,
): Record<string, string[]> {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return {}
  }

  // build pipes for boardrunners
  const boardboundaries: Record<string, string[]> = {}
  const ids = Object.keys(boardrunners)
  for (let i = 0; i < ids.length; ++i) {
    const board = ids[i]
    const player = boardrunners[board]

    // bail if board runtime not found
    const mayberuntime = memoryboundaryget<CODE_PAGE_RUNTIME>(board)
    if (!ispresent(mayberuntime?.board)) {
      continue
    }

    // read board data to scan for boundary ids
    boardboundaries[board] = memorycollectboundaryidsforboard(
      mainbook,
      mayberuntime.board,
    )
    for (const boundary of boardboundaries[board]) {
      const doc = memoryboundaryget(boundary) ?? {}
      const pipe = readboundarypipe(boundary, doc)
      const patch = pipe.emitdiff(doc)
      if (patch.length > 0) {
        boardrunnerpatch(vm, player, patch, boundary)
        if (showlog) {
          console.info('boardrunnerboundarymemorysync', player, boundary, patch)
        }
      }
    }
  }

  return boardboundaries
}
