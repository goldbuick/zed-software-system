import type { DEVICE } from 'zss/device'
import { boardrunnerpatch } from 'zss/device/api'
import type { JSON_PIPE_HANDLE } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { ispresent } from 'zss/mapping/types'
import { memoryboundaryget } from 'zss/memory/boundaries'
import { memorycollectboundaryidsforboard } from 'zss/memory/boundaryrouting'
import {
  memoryreadcodepagedata,
  memoryreadcodepagetype,
} from 'zss/memory/codepageoperations'
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
  const boardids = Object.keys(boardrunners)
  for (let i = 0; i < boardids.length; ++i) {
    const boardid = boardids[i]
    const player = boardrunners[boardid]

    const maybecodepage = memoryboundaryget<CODE_PAGE>(boardid)
    if (!ispresent(maybecodepage)) {
      continue
    }
    const boardentity =
      memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(maybecodepage)
    if (!ispresent(boardentity)) {
      continue
    }
    const flagboundaries = memorycollectboundaryidsforboard(
      mainbook,
      boardentity,
    )
    for (const boundaryid of flagboundaries) {
      const doc = memoryboundaryget(boundaryid) ?? ({} as BOUNDARY_DOC)
      const pipe = readboundarypipe(boundaryid, doc)
      const flagpatch = pipe.emitdiff(doc)
      if (flagpatch.length > 0) {
        boardrunnerpatch(vm, player, flagpatch, boundaryid)
      }
    }
  }
}
