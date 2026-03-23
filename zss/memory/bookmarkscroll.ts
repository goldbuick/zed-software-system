import {
  BOOKMARK_SCROLL_CHIP,
  BOOKMARK_SCROLL_SCROLLNAME,
  type ZssUrlBookmark,
} from 'zss/feature/bookmarks'
import {
  gadgetapplyscrolllines,
  scrolllinkescapefrag,
} from 'zss/gadget/data/applyscrolllines'
import { gadgetbbar, gadgethyperlink } from 'zss/gadget/data/api'

export function memorybookmarkscroll(
  player: string,
  urllist: ZssUrlBookmark[],
): void {
  gadgethyperlink(
    player,
    BOOKMARK_SCROLL_CHIP,
    'bookmark name',
    [`newname`, 'text'],
  )
  gadgethyperlink(player, BOOKMARK_SCROLL_CHIP, 'SAVE IT', [`bookmarksave`])
  gadgetbbar(player, 10)
  const rows: string[] = []
  for (let i = 0; i < urllist.length; ++i) {
    const idx = i + 1
    const b = urllist[i]
    rows.push(
      `!bookmarkurl hk ${idx}  ${idx}  ${scrolllinkescapefrag(b.href)};${scrolllinkescapefrag(`$CYANLOAD ${b.name}`)}`,
    )
    rows.push(
      `!bookmarkdel ${scrolllinkescapefrag(b.id)};${scrolllinkescapefrag(`$REDDELETE ${idx}`)}`,
    )
  }
  gadgetapplyscrolllines(
    player,
    BOOKMARK_SCROLL_SCROLLNAME,
    rows.join('\n'),
    BOOKMARK_SCROLL_CHIP,
  )
}
