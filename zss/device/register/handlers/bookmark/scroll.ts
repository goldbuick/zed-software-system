import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmbookmarkscroll } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import { readbookmarksfromstorage } from 'zss/feature/bookmarks'

export function handlebookmarkscroll(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    const blob = await readbookmarksfromstorage()
    vmbookmarkscroll(
      device,
      registerreadplayer(),
      blob.url,
      message.data ? blob.editor : [],
    )
  })
}
