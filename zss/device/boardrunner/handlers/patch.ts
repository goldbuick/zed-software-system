import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  type BOUNDARY_DOC,
  memorysyncpipe,
  readworkerboundarypipe,
} from 'zss/device/boardrunner/state'
import { decodepatchwire } from 'zss/feature/jsonpipe/wire'
import { isarray, ispresent } from 'zss/mapping/types'
import { memoryboundaryget, memoryboundaryset } from 'zss/memory/boundaries'
import { memoryreadroot } from 'zss/memory/session'

export function handlepatch(device: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [patchwire, id] = message.data as [unknown, string]
  const patch = decodepatchwire(patchwire)
  if (id) {
    const boundrypipe = readworkerboundarypipe(id)
    if (boundrypipe.isdesynced()) {
      return
    }
    const root = memoryboundaryget<BOUNDARY_DOC>(id) ?? {}
    const doc = boundrypipe.applyremote(root, patch)
    if (ispresent(doc)) {
      memoryboundaryset(id, doc)
    } else {
      device.reply(message, 'desync', id)
    }
  } else if (!memorysyncpipe.isdesynced()) {
    const root = memoryreadroot()
    const doc = memorysyncpipe.applyremote(root, patch)
    if (ispresent(doc)) {
      Object.assign(root, doc)
    } else {
      device.reply(message, 'desync')
    }
  }
}
