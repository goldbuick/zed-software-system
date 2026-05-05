import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerpaint } from 'zss/device/api'
import { isstring } from 'zss/mapping/types'
import { memoryboundaryget } from 'zss/memory/boundaries'
import { memoryreadroot } from 'zss/memory/session'

type BOUNDARY_DOC = Record<string, any>

/** Boardrunner worker asked for resync after patch/paint failure (jsonpipe desync). */
export function handleboardrunnerdesync(vm: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    const doc = memoryboundaryget(message.data) ?? ({} as BOUNDARY_DOC)
    boardrunnerpaint(vm, message.player, doc, message.data)
  } else {
    boardrunnerpaint(vm, message.player, memoryreadroot())
  }
}
