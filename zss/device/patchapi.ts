import type { DEVICELIKE } from 'zss/device/messagetypes'
import type { Operation } from 'zss/feature/jsonpipe/observe'
import { encodepatchwire } from 'zss/feature/jsonpipe/wire'

export function boardrunnerpatch(
  device: DEVICELIKE,
  player: string,
  patch: Operation[],
  boundary?: string,
) {
  device.emit(player, 'boardrunner:patch', [encodepatchwire(patch), boundary])
}

export function gadgetclientpatch(
  device: DEVICELIKE,
  player: string,
  patch: Operation[],
) {
  device.emit(player, 'gadgetclient:patch', encodepatchwire(patch))
}

export function vmboardrunnerpatch(
  device: DEVICELIKE,
  player: string,
  patch: Operation[],
  boundary?: string,
) {
  device.emit(player, 'vm:boardrunnerpatch', [encodepatchwire(patch), boundary])
}
