import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerjsondiffsync } from 'zss/device/api'
import { jsondiffsync } from 'zss/device/vm/state'
import { jsondiffsyncleafapply } from 'zss/feature/jsondiffsync/hub'
import { issyncmessage } from 'zss/feature/jsondiffsync/types'
import { ispresent } from 'zss/mapping/types'

export function handlejsondiffsync(vm: DEVICE, message: MESSAGE): void {
  console.info('vm:jsondiffsync', message.player, message.data)
  if (!issyncmessage(message.data)) {
    return
  }
  const [outbound] = jsondiffsyncleafapply(
    jsondiffsync,
    message.player,
    message.data,
  )
  if (ispresent(outbound)) {
    boardrunnerjsondiffsync(vm, message.player, outbound)
  }
}
