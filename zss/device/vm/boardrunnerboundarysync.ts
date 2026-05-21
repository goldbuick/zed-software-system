import type { DEVICE } from 'zss/device'
import { boardrunnerpatch } from 'zss/device/api'
import { boardrunneraccessfor } from 'zss/device/vm/boardrunnermanagement'
import type { JSON_PIPE_HANDLE, Operation } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { ispresent } from 'zss/mapping/types'
import { memorycollecttickboundaries } from 'zss/memory/boardwait'
import { memoryboundaryget, memoryboundaryset } from 'zss/memory/boundaries'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
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

export function boardrunnerboundarypaint(boundary: string, doc: BOUNDARY_DOC) {
  // read boundary pipe
  const pipe = readboundarypipe(boundary, doc)
  // apply full sync to shadow
  pipe.applyfullsync(doc)
  // update boundary
  memoryboundaryset(boundary, doc)
}

export function boardrunnerboundarypatch(
  boundary: string,
  operations: Operation[],
) {
  const root = memoryboundaryget<BOUNDARY_DOC>(boundary) ?? {}
  // read boundary pipe
  const pipe = readboundarypipe(boundary, root)
  const doc = pipe.applyremote(root, operations)
  // ignore bad patch
  if (!ispresent(doc)) {
    pipe.cleardesync()
    return false
  }
  // update boundary
  memoryboundaryset(boundary, doc)
  // console.info(
  //   `${self.name} $$$ BOARDRUNNERBOUNDARYPATCH\n${boundary}`,
  //   operations.length,
  //   operations,
  // )
  return true
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
    const boardboundaries = memorycollecttickboundaries(
      mainbook,
      boardrunneraccessfor(board),
    )
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
