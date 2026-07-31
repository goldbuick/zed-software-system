import type { DEVICE } from 'zss/device'
import { apierror } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import { boardsnapshot } from 'zss/feature/boardsnapshot'
import { ispresent } from 'zss/mapping/types'

export function handleboardsnapshot(vm: DEVICE, message: MESSAGE): void {
  const [boardid] = message.data as [string]
  const player = message.player

  const snapshotboard = boardsnapshot(boardid)
  if (!ispresent(snapshotboard)) {
    apierror(vm, player, 'snapshot', `snapshot: failed for board ${boardid}`)
    return
  }

  boardrunnerpushupdates(vm)
}
