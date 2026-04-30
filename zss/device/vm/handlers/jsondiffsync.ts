import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerjsondiffsync } from 'zss/device/api'
import { resolvejsonsynhub } from 'zss/device/vm/jsondiffsynroutes'
import { jsondiffsyncleafapply } from 'zss/feature/jsondiffsync/hub'
import { logjsondiffsyncoutbound } from 'zss/feature/jsondiffsync/syncdebug'
import { issyncmessage } from 'zss/feature/jsondiffsync/types'
import { ispresent } from 'zss/mapping/types'

/**
 * Merge leaf deltas into the authoritative hub (`jsondiffsync.working` === shared MEMORY root)
 * inside `jsondiffsyncleafapply` before any outbound is built. Outbound messages exist so the
 * boardrunner leaf can ACK and align its shadow — they are not a second application step on VM memory.
 */
export function handlejsondiffsync(vm: DEVICE, message: MESSAGE): void {
  if (!issyncmessage(message.data)) {
    return
  }
  const data = message.data
  const hub = resolvejsonsynhub(data.streamid, data.boardsynctarget)
  if (!ispresent(hub)) {
    return
  }
  const [outbound] = jsondiffsyncleafapply(hub, message.player, data)
  if (ispresent(outbound)) {
    logjsondiffsyncoutbound(message.player, 'vm:jsondiffsync', outbound)
    boardrunnerjsondiffsync(vm, message.player, outbound)
  }
}
