import type { DEVICE } from 'zss/device'
import { apitoast } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import type { MESSAGE } from 'zss/device/types'
import { appendurlbookmark } from 'zss/feature/bookmarks'
import { contenttohashfragment } from 'zss/feature/storage'
import { isarray, isstring } from 'zss/mapping/types'

export function handlebookmarkcontentsave(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    if (!isarray(message.data)) {
      return
    }
    const [maybename, maybecontent] = message.data
    if (!isstring(maybename) || !isstring(maybecontent)) {
      return
    }
    const fragment = await contenttohashfragment(maybecontent)
    const href = `${location.origin}/#${fragment}`
    await appendurlbookmark(maybename, href)
    apitoast(device, registerreadplayer(), `bookmarked $green${maybename}`)
  })
}
