import {
  BOOKMARK_SCROLL_CHIP,
  BOOKMARK_NAME_TARGET,
  BOOKMARK_SCROLL_SCROLLNAME,
  type ZssUrlBookmark,
} from 'zss/feature/bookmarks'
import {
  gadgetcheckqueue,
  gadgetheader,
  gadgethyperlink,
  gadgetreadqueue,
  gadgetsection,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'

/** Build gadget scroll: name row (client modem), save row, copy links, delete links. */
export function memorybookmarkscroll(
  player: string,
  urllist: ZssUrlBookmark[],
): void {
  gadgetheader(player, 'bookmarks')
  gadgetsection(player, 'url bookmarks')
  gadgetreadqueue(player).push([
    BOOKMARK_SCROLL_CHIP,
    '$whiteName$blue (required)',
    BOOKMARK_NAME_TARGET,
    'text',
  ])
  gadgetreadqueue(player).push([
    BOOKMARK_SCROLL_CHIP,
    '$greenSAVE$white current URL',
    '',
    'bookmarksave',
  ])
  for (let i = 0; i < urllist.length; ++i) {
    const b = urllist[i]
    gadgettext(player, '')
    gadgethyperlink(
      player,
      BOOKMARK_SCROLL_CHIP,
      `$cyan${b.name}$white — copy link`,
      ['copyit', b.href],
    )
    gadgetreadqueue(player).push([
      BOOKMARK_SCROLL_CHIP,
      `$reddelete$white ${b.name}`,
      b.id,
      'bookmarkdel',
    ])
  }
  const shared = gadgetstate(player)
  shared.scrollname = BOOKMARK_SCROLL_SCROLLNAME
  shared.scroll = gadgetcheckqueue(player)
}
