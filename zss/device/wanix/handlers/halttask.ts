import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { halttask } from 'zss/device/wanix/runtime'

import { runwanixhost } from './hostutil'

export function handlehalttask(wanix: DEVICE, message: MESSAGE): void {
  const taskid = String(
    Array.isArray(message.data) ? message.data[0] : (message.data ?? ''),
  )
  runwanixhost(wanix, message, 'halttask', () => halttask(taskid))
}
