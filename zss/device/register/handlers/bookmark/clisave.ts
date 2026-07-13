import type { DEVICE } from 'zss/device'
import { apitoast, vmclearscroll } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/types'
import { syncterminalbookmarkpins } from 'zss/device/register/helpers/bootstrap'
import { registerreadplayer } from 'zss/device/registerplayer'
import { appendterminalbookmark } from 'zss/feature/bookmarks'
import { isstring } from 'zss/mapping/types'

export function handlebookmarkclisave(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    const line = message.data
    if (!isstring(line) || !line.trim()) {
      apitoast(device, registerreadplayer(), 'nothing to bookmark')
      return
    }
    await appendterminalbookmark(line)
    await syncterminalbookmarkpins()
    apitoast(device, registerreadplayer(), `bookmarked $green${line}`)
    vmclearscroll(device, registerreadplayer())
  })
}
