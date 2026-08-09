import type { DEVICE } from 'zss/device'
import { apitoast, vmclearscroll } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import type { MESSAGE } from 'zss/device/types'
import { updateurlbookmarkbyid } from 'zss/feature/bookmarks'
import { isstring } from 'zss/mapping/types'

export function handlebookmarkurlsaveover(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    const id = message.data
    if (!isstring(id)) {
      return
    }
    const entry = await updateurlbookmarkbyid(id, location.href)
    if (!entry) {
      apitoast(device, registerreadplayer(), 'bookmark not found')
      return
    }
    apitoast(device, registerreadplayer(), `updated $green${entry.name}`)
    vmclearscroll(device, registerreadplayer())
  })
}
