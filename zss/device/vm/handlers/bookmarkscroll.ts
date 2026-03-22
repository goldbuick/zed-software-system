import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { type ZssUrlBookmark, normalizebookmarks } from 'zss/feature/bookmarks'
import { isarray } from 'zss/mapping/types'
import { memorybookmarkscroll } from 'zss/memory/bookmarkscroll'

export function handlebookmarkscroll(_vm: DEVICE, message: MESSAGE): void {
  let urllist: ZssUrlBookmark[] = []
  if (isarray(message.data)) {
    const blob = normalizebookmarks({
      url: message.data,
      terminal: [],
      editor: [],
    })
    urllist = blob.url
  }
  memorybookmarkscroll(message.player, urllist)
}
