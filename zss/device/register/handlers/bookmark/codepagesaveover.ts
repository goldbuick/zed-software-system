import type { DEVICE } from 'zss/device'
import { apitoast, vmclearscroll } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import type { MESSAGE } from 'zss/device/types'
import { updateeditorbookmarkbyid } from 'zss/feature/bookmarks'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

export function handlebookmarkcodepagesaveover(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    if (!isarray(message.data)) {
      return
    }
    const [id, type, title, codepage] = message.data
    if (
      !isstring(id) ||
      !isstring(type) ||
      !isstring(title) ||
      !ispresent(codepage)
    ) {
      return
    }
    const entry = await updateeditorbookmarkbyid(id, {
      type,
      title,
      codepage,
    })
    if (!entry) {
      apitoast(device, registerreadplayer(), 'bookmark not found')
      return
    }
    apitoast(device, registerreadplayer(), `updated $green${entry.title}`)
    vmclearscroll(device, registerreadplayer())
  })
}
