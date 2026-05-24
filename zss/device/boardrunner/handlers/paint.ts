import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  memorysyncpipe,
  readworkerboundarypipe,
} from 'zss/device/boardrunner/state'
import { isarray } from 'zss/mapping/types'
import { memoryboundaryset } from 'zss/memory/boundaries'
import { memoryreadroot } from 'zss/memory/session'

export function handlepaint(_device: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [doc, id] = message.data as [any, string]
  if (id) {
    const boundrypipe = readworkerboundarypipe(id)
    memoryboundaryset(id, boundrypipe.applyfullsync(doc))
  } else {
    Object.assign(memoryreadroot(), memorysyncpipe.applyfullsync(doc))
  }
}
