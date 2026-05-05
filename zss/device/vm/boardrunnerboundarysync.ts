import type { DEVICE } from 'zss/device'
import { boardrunnerpatch } from 'zss/device/api'
import type { JSON_PIPE_HANDLE } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { ispresent } from 'zss/mapping/types'
import { memoryboundaryget } from 'zss/memory/boundaries'
import { memoryreadcodepagetype } from 'zss/memory/codepageoperations'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import {
  memoryreadbookbysoftware,
  memoryreadbooklist,
  memoryreadoperator,
} from 'zss/memory/session'
import { CODE_PAGE, CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

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

export function boardrunnerboundarymemorysync(vm: DEVICE) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const books = memoryreadbooklist()
  const activelist = new Set<string>([
    memoryreadoperator(),
    ...(mainbook.activelist ?? []),
  ])
  for (const book of books) {
    for (const page of book.pages) {
      // read boundary doc
      const boundary: CODE_PAGE = memoryboundaryget(page) ?? ({} as CODE_PAGE)
      // only sync non-board pages
      if (memoryreadcodepagetype(boundary) === CODE_PAGE_TYPE.BOARD) {
        continue
      }
      // create boundary jsonpipe if needed
      const pipe = readboundarypipe(page, boundary)
      // generate patch
      const patch = pipe.emitdiff(boundary)
      if (patch.length === 0) {
        continue
      }
      // emit diff
      for (const player of activelist) {
        boardrunnerpatch(vm, player, patch)
      }
    }
  }

  // build pipes for boardrunners
  const boards = Object.keys(boardrunners)
  for (const board of boards) {
    // read the runner
    const player = boardrunners[board]
    // add the board codepage boundary
    const boardboundary = memoryboundaryget(board) ?? ({} as BOUNDARY_DOC)
    // create boundary jsonpipe if needed
    const boardpipe = readboundarypipe(board, boardboundary)
    // generate patch
    const patch = boardpipe.emitdiff(boardboundary)
    if (patch.length > 0) {
      boardrunnerpatch(vm, player, patch, board)
    }
    /* We need to sync
     * 1. flags for players on the board
     * 2. synth and playqueues for the board
     * 3. tracking flags for the board
     */
  }
}
