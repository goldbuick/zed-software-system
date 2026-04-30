import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { resolvejsonsynhub } from 'zss/device/vm/jsondiffsynroutes'
import { hubsyncleafrowafterhuboutbound } from 'zss/feature/jsondiffsync/hub'
import { JSONDIFFSYNC_STREAM_MEMORY } from 'zss/feature/jsondiffsync/types'

/** Called from boardrunner after a hub→leaf sync message is applied successfully there. */
export function handlehubsyncleaf(vm: DEVICE, message: MESSAGE): void {
  void vm
  const d = message.data as
    | { streamid?: string; boardsynctarget?: string }
    | undefined
  const streamid =
    d && typeof d.streamid === 'string' ? d.streamid : JSONDIFFSYNC_STREAM_MEMORY
  const boardsynctarget =
    d && typeof d.boardsynctarget === 'string'
      ? d.boardsynctarget
      : undefined
  const hub = resolvejsonsynhub(streamid, boardsynctarget)
  if (!hub) {
    return
  }
  hubsyncleafrowafterhuboutbound(hub, message.player)
}
