import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { normalizebookmarks, type ZssUrlBookmark } from 'zss/feature/bookmarks'
import { isarray } from 'zss/mapping/types'
import { memorybookmarkscroll } from 'zss/memory/bookmarkscroll'

export function handlebookmarkscroll(_vm: DEVICE, message: MESSAGE): void {
  const raw = message.data
  let urllist: ZssUrlBookmark[] = []
  if (isarray(raw)) {
    const blob = normalizebookmarks({ url: raw, terminal: [], editor: [] })
    urllist = blob.url
  }
  memorybookmarkscroll(message.player, urllist)
}
