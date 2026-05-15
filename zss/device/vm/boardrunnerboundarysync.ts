import type { DEVICE } from 'zss/device'
import { boardrunnerpaint, boardrunnerpatch } from 'zss/device/api'
import type { JSON_PIPE_HANDLE, Operation } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { ispresent } from 'zss/mapping/types'
import { memoryboundaryget, memoryboundaryset } from 'zss/memory/boundaries'
import { memorycollectboundaryidsforboard } from 'zss/memory/boundaryrouting'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { CODE_PAGE_RUNTIME, MEMORY_LABEL } from 'zss/memory/types'
import { measurestage, recordemitdiff } from 'zss/perf/ticktimingstats'

import { boardrunners } from './state'

type BOUNDARY_DOC = Record<string, any>
type BOUNDARY_JSONPIPE = JSON_PIPE_HANDLE<BOUNDARY_DOC>
const boundaryjsonpipes = new Map<string, BOUNDARY_JSONPIPE>()

function readboundarypipe(id: string, boundary: BOUNDARY_DOC) {
  if (!boundaryjsonpipes.has(id)) {
    const pipe = createjsonpipe<BOUNDARY_DOC>(
      boundary,
      memoryrootshouldemitpath,
    )
    boundaryjsonpipes.set(id, pipe)
  }
  return boundaryjsonpipes.get(id)!
}

export function boardrunnerboundarypatch(
  vm: DEVICE,
  player: string,
  boundary: string,
  operations: Operation[],
) {
  const root = memoryboundaryget<BOUNDARY_DOC>(boundary) ?? {}
  if (!ispresent(root)) {
    return
  }
  // read boundary pipe
  const pipe = readboundarypipe(boundary, root)
  const doc = pipe.applyremote(root, operations)
  // ignore bad patch
  if (!ispresent(doc)) {
    console.info(`${self.name} $$$ BAD PATCH\n${boundary}`)
    // maybe log here too ?
    pipe.cleardesync()
    // push reset to the boardrunner boundary
    boardrunnerpaint(vm, player, root, boundary)
    return
  }
  // update boundary
  memoryboundaryset(boundary, doc)
}

export function boardrunnerboundarysync(vm: DEVICE) {
  measurestage('vm:boundarysync', () => boardrunnerboundarysyncbody(vm))
}

function boardrunnerboundarysyncbody(vm: DEVICE) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  // build pipes for boardrunners
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
    const boardboundaries = memorycollectboundaryidsforboard(
      mainbook,
      mayberuntime.board,
    )
    // process boundaries
    for (const id of boardboundaries) {
      const doc = memoryboundaryget(id) ?? {}
      const pipe = readboundarypipe(id, doc)
      const patch = pipe.emitdiff(doc)
      if (patch.length > 0) {
        recordemitdiff('vm:boundarysync', patch.length, 1, 1)
        boardrunnerpatch(vm, player, patch, id)
      }
    }
  }
}
