import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmclearscroll } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import { runbookmarkurlnavigate } from 'zss/device/runbookmark'
import { isstring } from 'zss/mapping/types'

export function handlebookmarkurlnavigate(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    if (isstring(message.data)) {
      await runbookmarkurlnavigate(device, registerreadplayer(), message.data)
      vmclearscroll(device, registerreadplayer())
    }
  })
}
