import type { DEVICE } from 'zss/device'
import { vmboardrunnerpatch } from 'zss/device/api'
import { ispresent } from 'zss/mapping/types'
import { memoryboundaryget } from 'zss/memory/boundaries'
import {
  memoryreadboardrunner,
  memoryreadoperator,
  memoryreadroot,
} from 'zss/memory/session'

import {
  type BOUNDARY_DOC,
  assignedboundaries,
  memorysyncpipe,
  readworkerboundarypipe,
} from './state'

export function waitformemory() {
  return memoryreadoperator() === ''
}

export function pushworkerupdates(device: DEVICE) {
  const runner = memoryreadboardrunner()

  const memorypatch = memorysyncpipe.emitdiff(memoryreadroot())
  if (memorypatch.length > 0) {
    vmboardrunnerpatch(device, runner, memorypatch)
  }

  for (const id of assignedboundaries) {
    const pipe = readworkerboundarypipe(id)
    const doc = memoryboundaryget<BOUNDARY_DOC>(id)
    if (ispresent(doc)) {
      const patch = pipe.emitdiff(doc)
      if (patch.length > 0) {
        vmboardrunnerpatch(device, runner, patch, id)
      }
    }
  }
}
