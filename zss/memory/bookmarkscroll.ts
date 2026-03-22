import {
  BOOKMARK_SCROLL_CHIP,
  BOOKMARK_SCROLL_SCROLLNAME,
  type ZssUrlBookmark,
} from 'zss/feature/bookmarks'
import {
  gadgetbbar,
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
} from 'zss/gadget/data/api'

/** Build gadget scroll: name row (client modem), save row, copy links, delete links. */
export function memorybookmarkscroll(
  player: string,
  urllist: ZssUrlBookmark[],
): void {
  gadgethyperlink(
    player,
    BOOKMARK_SCROLL_CHIP,
    'bookmark name',
    [`newname`, 'text'],
    // get,
    // set,
  )
  gadgethyperlink(player, BOOKMARK_SCROLL_CHIP, 'SAVE IT', [`bookmarksave`])
  gadgetbbar(player, 10)
  for (let i = 0; i < urllist.length; ++i) {
    const idx = i + 1
    const b = urllist[i]
    gadgethyperlink(player, BOOKMARK_SCROLL_CHIP, `$CYANLOAD ${b.name}`, [
      'bookmarkurl',
      'hk',
      `${idx}`,
      ` ${idx} `,
      b.href,
    ])
    gadgethyperlink(player, BOOKMARK_SCROLL_CHIP, `$REDDELETE ${idx}`, [
      'bookmarkdel',
      b.id,
    ])
  }
  const shared = gadgetstate(player)
  shared.scrollname = BOOKMARK_SCROLL_SCROLLNAME
  shared.scroll = gadgetcheckqueue(player)
}
