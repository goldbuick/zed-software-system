import type { JSON_PIPE_HANDLE } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { memoryboundaryget } from 'zss/memory/boundaries'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import { type MEMORY_ROOT, memoryreadroot } from 'zss/memory/session'

export type BOUNDARY_DOC = Record<string, any>
export type BOUNDARY_JSONPIPE = JSON_PIPE_HANDLE<BOUNDARY_DOC>

export const assignedboundaries = new Set<string>()
export const playersonassignedboard = new Set<string>()

export let memorysyncaccess = 0
export let firsttick = 0

export const memorysyncpipe = createjsonpipe<MEMORY_ROOT>(
  memoryreadroot(),
  memoryrootshouldemitpath,
)

const boundarysyncpipes = new Map<string, BOUNDARY_JSONPIPE>()

export function readworkerboundarypipe(boundary: string): BOUNDARY_JSONPIPE {
  if (!boundarysyncpipes.has(boundary)) {
    const init = memoryboundaryget<BOUNDARY_DOC>(boundary) ?? {}
    const pipe = createjsonpipe<BOUNDARY_DOC>(init, memoryrootshouldemitpath)
    boundarysyncpipes.set(boundary, pipe)
  }
  return boundarysyncpipes.get(boundary)!
}

export function resetmemorysyncaccess() {
  memorysyncaccess = 0
}

export function incmemorysyncaccess() {
  ++memorysyncaccess
}

export function resetfirsttick() {
  firsttick = 0
}

export function incfirsttick() {
  ++firsttick
}

export function readfirsttick() {
  return firsttick
}
