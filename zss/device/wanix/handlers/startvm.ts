import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { startvm } from 'zss/device/wanix/runtime'
import {
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
} from 'zss/feature/wanix/wanixroomtypes'

import { runwanixhost } from './hostutil'

export function handlestartvm(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : []
  const mem = String(args[0] ?? DEFAULT_WANIX_VM_MEM)
  const vmid = String(args[1] ?? DEFAULT_WANIX_VM_ID)
  runwanixhost(wanix, message, 'startvm', () => startvm(mem, vmid))
}
