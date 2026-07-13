import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { applyroom } from 'zss/device/wanixserver/runtime'
import type { WanixRoomConfig } from 'zss/feature/wanix/wanixroomtypes'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'

import { runwanixhost } from './hostutil'

export function handleapplyroom(wanix: DEVICE, message: MESSAGE): void {
  const raw = Array.isArray(message.data) ? message.data[0] : message.data
  const config = (raw as WanixRoomConfig | undefined) ?? createidleroomconfig()
  runwanixhost(wanix, message, 'applyroom', () => applyroom(config))
}
