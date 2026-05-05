import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerpaint } from 'zss/device/api'
import { deepcopy } from 'zss/mapping/types'
import { memoryreadroot } from 'zss/memory/session'

/** Boardrunner worker asked for full MEMORY resync after patch/paint failure (jsonpipe desync). */
export function handleboardrunnerdesync(vm: DEVICE, message: MESSAGE): void {
  boardrunnerpaint(vm, message.player, deepcopy(memoryreadroot()))
}
