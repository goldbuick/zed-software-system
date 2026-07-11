import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apierror, apilog } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { isstring } from 'zss/mapping/types'

import { halttaskinroom, readwanixroomconfig, stopwanixroom } from './wanixroom'

export function handlestop(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    try {
      if (isstring(message.data) && message.data.trim()) {
        const taskid = message.data.trim()
        const result = await halttaskinroom(taskid)
        if (result.idle) {
          apilog(device, message.player, 'wanix no such task')
          return
        }
        apilog(device, message.player, `wanix task stopped ${taskid}`)
        return
      }
      if (readwanixroomconfig().mode === 'idle') {
        apilog(device, message.player, 'wanix already idle')
        return
      }
      await stopwanixroom()
      apilog(device, message.player, 'wanix stopped')
    } catch (err) {
      apierror(
        device,
        message.player,
        'wanix',
        err instanceof Error ? err.message : String(err),
      )
    }
  })
}
