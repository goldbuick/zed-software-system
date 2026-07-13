import type { DEVICE } from 'zss/device'
import { apitoast, vmclearscroll } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/messagetypes'
import { registerreadplayer } from 'zss/device/registerplayer'
import { appendeditorbookmark } from 'zss/feature/bookmarks'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

export function handlebookmarkcodepagesave(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    if (isarray(message.data)) {
      const [type, title, codepage] = message.data
      if (isstring(type) && isstring(title) && ispresent(codepage)) {
        await appendeditorbookmark({
          type,
          title,
          codepage,
        })
        apitoast(device, registerreadplayer(), `bookmarked $green${title}`)
        vmclearscroll(device, registerreadplayer())
      }
    }
  })
}
