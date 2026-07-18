import type { DEVICE } from 'zss/device'
import { vmclearscroll } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import { runbookmarkcopytogame } from 'zss/device/runbookmark'
import type { MESSAGE } from 'zss/device/types'
import { isstring } from 'zss/mapping/types'

export function handlebookmarkcodepagecopytogame(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    if (isstring(message.data)) {
      await runbookmarkcopytogame(device, registerreadplayer(), message.data)
      vmclearscroll(device, registerreadplayer())
    }
  })
}
