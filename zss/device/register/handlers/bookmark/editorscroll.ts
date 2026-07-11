import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmeditorbookmarkscroll } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import { readbookmarksfromstorage } from 'zss/feature/bookmarks'
import { isarray, isstring } from 'zss/mapping/types'

export function handleeditorbookmarkscroll(
  device: DEVICE,
  message: MESSAGE,
): void {
  doasync(device, message.player, async () => {
    if (isarray(message.data)) {
      const [codepagename, codepagepath] = message.data
      if (isstring(codepagename) && isarray(codepagepath)) {
        const blob = await readbookmarksfromstorage()
        vmeditorbookmarkscroll(
          device,
          registerreadplayer(),
          blob.editor,
          codepagename,
          codepagepath,
        )
      }
    }
  })
}
