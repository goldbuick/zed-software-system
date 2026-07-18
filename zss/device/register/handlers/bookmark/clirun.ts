import type { DEVICE } from 'zss/device'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import type { MESSAGE } from 'zss/device/types'
import { runterminalbookmarkclibyid } from 'zss/feature/bookmarks'
import { MAYBE, isarray, isstring } from 'zss/mapping/types'

export function handlebookmarkclirun(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    let pinid: MAYBE<string>
    if (isarray(message.data)) {
      const arr = message.data as unknown[]
      const last = arr[arr.length - 1]
      if (isstring(last)) {
        pinid = last
      }
    } else if (isstring(message.data)) {
      pinid = message.data
    }
    if (!pinid) {
      return
    }
    await runterminalbookmarkclibyid(device, registerreadplayer(), pinid)
  })
}
