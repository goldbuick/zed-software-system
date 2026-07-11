import type { WanixRoomConfig } from 'zss/feature/wanix/wanixroomtypes'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'

export const wanixroomconfigbox: { current: WanixRoomConfig } = {
  current: createidleroomconfig(),
}

export function readwanixroomconfig(): WanixRoomConfig {
  return wanixroomconfigbox.current
}
