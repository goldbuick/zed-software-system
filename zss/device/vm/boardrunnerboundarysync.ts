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

function createpipe(boundary: BOUNDARY_DOC) {
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
      // create boundary jsonpipe
      if (!boundaryjsonpipes.has(page)) {
        const pipe = createpipe(boundary)
        boundaryjsonpipes.set(page, pipe)
      }
      // generate patch
      const pipe = boundaryjsonpipes.get(page)!
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
    // start with board codepage boundary
    const boundary = memoryboundaryget(board) ?? ({} as BOUNDARY_DOC)
    // create boundary jsonpipe
    if (!boundaryjsonpipes.has(board)) {
      const pipe = createpipe(boundary)
      boundaryjsonpipes.set(board, pipe)
    }
    // generate patch
    const pipe = boundaryjsonpipes.get(board)!
    const patch = pipe.emitdiff(boundary)
    if (patch.length > 0) {
      boardrunnerpatch(vm, boardrunners[board], patch, board)
    }
  }
}
