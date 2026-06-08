import type { DEVICE } from 'zss/device'
import { vmboardrunnerpatch } from 'zss/device/api'
import { ispresent } from 'zss/mapping/types'
import { memoryboundaryget } from 'zss/memory/boundaries'
import {
  memoryreadassignedboard,
  memoryreadboardrunner,
  memoryreadoperator,
  memoryreadroot,
} from 'zss/memory/session'

import {
  ishostmemorytraceenabled,
  tracehostmemory,
} from 'zss/testsupport/hostmemorytrace'
import type { Operation } from 'zss/feature/jsonpipe/observe'

import {
  type BOUNDARY_DOC,
  assignedboundaries,
  memorysyncpipe,
  readworkerboundarypipe,
} from './state'

export function waitformemory() {
  return memoryreadoperator() === ''
}

function tracepatchemit(
  player: string,
  operations: Operation[],
  boundary?: string,
): void {
  if (!ishostmemorytraceenabled()) {
    return
  }
  const paths = operations
    .slice(0, 12)
    .map((op) => String((op as { path?: string }).path ?? ''))
  const isboundary = !!boundary
  tracehostmemory(
    isboundary ? 'join:boundary:emit' : 'join:memory:emit',
    'H12',
    player,
    undefined,
    {
      opcount: operations.length,
      boundary: boundary ?? '',
      charops: paths.filter((p) => p.includes('/char')).length,
      terrainops: paths.filter((p) => p.includes('/terrain/')).length,
      samplepaths: paths,
    },
  )
}

export function pushworkerupdates(device: DEVICE) {
  const runner = memoryreadboardrunner()

  const memorypatch = memorysyncpipe.emitdiff(memoryreadroot())
  if (memorypatch.length > 0) {
    // #region agent log
    tracepatchemit(memoryreadoperator(), memorypatch, '')
    // #endregion
    vmboardrunnerpatch(device, runner, memorypatch)
  }

  const boundaryids = new Set(assignedboundaries)
  const assignedboard = memoryreadassignedboard()
  if (assignedboard) {
    boundaryids.add(assignedboard)
  }

  for (const id of boundaryids) {
    const pipe = readworkerboundarypipe(id)
    const doc = memoryboundaryget<BOUNDARY_DOC>(id)
    if (ispresent(doc)) {
      const patch = pipe.emitdiff(doc)
      if (patch.length > 0) {
        // #region agent log
        tracepatchemit(memoryreadoperator(), patch, id)
        // #endregion
        vmboardrunnerpatch(device, runner, patch, id)
      }
    }
  }
}
