import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { jsondiffsync } from 'zss/device/vm/state'
import { hubsyncleafrowafterhuboutbound } from 'zss/feature/jsondiffsync/hub'

/** Called from boardrunner after a hub→leaf sync message is applied successfully there. */
export function handlehubsyncleaf(vm: DEVICE, message: MESSAGE): void {
  void vm
  hubsyncleafrowafterhuboutbound(jsondiffsync, message.player)
}
