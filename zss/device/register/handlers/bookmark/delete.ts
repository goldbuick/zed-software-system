import type { DEVICE } from 'zss/device'
import { apitoast, vmclearscroll } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { syncterminalbookmarkpins } from 'zss/device/register/helpers/bootstrap'
import { registerreadplayer } from 'zss/device/registerplayer'
import type { MESSAGE } from 'zss/device/types'
import { removebookmarkbyid } from 'zss/feature/bookmarks'
import { isstring } from 'zss/mapping/types'

export function handlebookmarkdelete(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    const id = message.data
    if (!isstring(id)) {
      return
    }
    const ok = await removebookmarkbyid(id)
    if (ok) {
      apitoast(device, registerreadplayer(), 'bookmark removed')
      await syncterminalbookmarkpins()
      vmclearscroll(device, registerreadplayer())
    }
  })
}
