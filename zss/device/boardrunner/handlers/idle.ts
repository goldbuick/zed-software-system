import type { DEVICE } from 'zss/device'
import { type MESSAGE, workstatus } from 'zss/device/api'
import {
  assignedboundaries,
  resetmemorysyncaccess,
} from 'zss/device/boardrunner/state'
import { isstring } from 'zss/mapping/types'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memoryreadboardrunner,
  memorywriteassignedboard,
  memorywriteoperator,
} from 'zss/memory/session'

export function handleidle(device: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    const runner = memoryreadboardrunner()
    workstatus(device, runner, `idle ${message.data}`)
    resetmemorysyncaccess()
    memorywriteoperator('')
    memorywriteassignedboard('')
    memoryboundariesclear()
    assignedboundaries.clear()
  }
}
