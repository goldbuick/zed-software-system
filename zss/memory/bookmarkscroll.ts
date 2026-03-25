import {
  BOOKMARK_NAME_TARGET,
  BOOKMARK_SCROLL_CHIP,
  BOOKMARK_SCROLL_SCROLLNAME,
  type ZssUrlBookmark,
} from 'zss/feature/bookmarks'
import { gadgetbbar, gadgethyperlink } from 'zss/gadget/data/api'
import {
  scrolllinkescapefrag,
  scrollwritelines,
} from 'zss/gadget/data/scrollwritelines'

export function memorybookmarkscroll(
  player: string,
  urllist: ZssUrlBookmark[],
): void {
  gadgethyperlink(player, BOOKMARK_SCROLL_CHIP, 'bookmark name', [
    BOOKMARK_NAME_TARGET,
    'text',
  ])
  gadgethyperlink(player, BOOKMARK_SCROLL_CHIP, 'SAVE IT', [`bookmarksave`])
  gadgetbbar(player, 10)
  const rows: string[] = []
  for (let i = 0; i < urllist.length; ++i) {
    const idx = i + 1
    const b = urllist[i]
    // PanelHotkey args (after chip/label/target/hk): shortcut, badge text, maybenoclose, ...data - use "" so href stays in data and scroll closes.
    rows.push(
      `!bookmarkurl hk ${idx} " ${idx} " "" ${scrolllinkescapefrag(b.href)};${scrolllinkescapefrag(`$CYANLOAD ${b.name}`)}`,
    )
    rows.push(
      `!bookmarkdel hyperlink ${scrolllinkescapefrag(b.id)};${scrolllinkescapefrag(`$REDDELETE ${idx}`)}`,
    )
  }
  scrollwritelines(
    player,
    BOOKMARK_SCROLL_SCROLLNAME,
    rows.join('\n'),
    BOOKMARK_SCROLL_CHIP,
  )
}
