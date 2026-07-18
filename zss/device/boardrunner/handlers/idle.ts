import { debugingest } from 'zss/debugingest'
import type { DEVICE } from 'zss/device'
import { workstatus } from 'zss/device/api'
import {
  assignedboundaries,
  resetmemorysyncaccess,
} from 'zss/device/boardrunner/state'
import type { MESSAGE } from 'zss/device/types'
import { isstring } from 'zss/mapping/types'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memoryreadassignedboard,
  memoryreadboardrunner,
  memorywriteassignedboard,
  memorywriteoperator,
} from 'zss/memory/session'

export function handleidle(device: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    const runner = memoryreadboardrunner()
    const priorboard = memoryreadassignedboard()
    debugingest(
      'idle.ts:handleidle',
      'boardrunner idle on board change',
      {
        runner: runner ?? '',
        priorboard: priorboard ?? '',
        reason: message.data,
      },
      'BC4',
    )
    workstatus(device, runner, `idle ${message.data}`)
    resetmemorysyncaccess()
    memorywriteoperator('')
    memorywriteassignedboard('')
    memoryboundariesclear()
    assignedboundaries.clear()
  }
}
