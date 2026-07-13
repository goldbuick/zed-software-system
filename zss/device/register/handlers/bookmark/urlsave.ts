import type { DEVICE } from 'zss/device'
import { apitoast, vmclearscroll } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/messagetypes'
import { modemreadtextsync } from 'zss/device/modem'
import { registerreadplayer } from 'zss/device/registerplayer'
import {
  BOOKMARK_NAME_TARGET,
  BOOKMARK_SCROLL_CHIP,
  appendurlbookmark,
} from 'zss/feature/bookmarks'
import { paneladdress } from 'zss/gadget/data/types'

export function handlebookmarkurlsave(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    const addr = paneladdress(BOOKMARK_SCROLL_CHIP, BOOKMARK_NAME_TARGET)
    const rawname = modemreadtextsync(addr).trim()
    if (!rawname.length) {
      apitoast(device, registerreadplayer(), 'enter a bookmark name first')
      return
    }
    await appendurlbookmark(rawname, location.href)
    apitoast(device, registerreadplayer(), `bookmarked $green${rawname}`)
    vmclearscroll(device, registerreadplayer())
  })
}
