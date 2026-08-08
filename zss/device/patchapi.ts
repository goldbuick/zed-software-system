import type { DEVICELIKE } from 'zss/device/types'
import type { Operation } from 'zss/feature/jsonpipe/observe'
import { encodepatchwire } from 'zss/feature/jsonpipe/wire'

export function gadgetclientpatch(
  device: DEVICELIKE,
  player: string,
  patch: Operation[],
) {
  device.emit(player, 'gadgetclient:patch', encodepatchwire(patch))
}
