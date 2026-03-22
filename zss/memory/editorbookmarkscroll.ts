import {
  EDITOR_BOOKMARK_SCROLL_CHIP,
  EDITOR_BOOKMARK_SCROLL_SCROLLNAME,
  type ZssEditorBookmark,
} from 'zss/feature/bookmarks'
import {
  gadgetbbar,
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
} from 'zss/gadget/data/api'

export function memoryeditorbookmarkscroll(
  player: string,
  editorlist: ZssEditorBookmark[],
): void {
  gadgethyperlink(
    player,
    EDITOR_BOOKMARK_SCROLL_CHIP,
    '$GREENBOOKMARK CURRENT PAGE',
    ['snapshotcurrent', 'hk', 's', ` S `, '1'],
  )
  gadgetbbar(player, 10)
  for (let i = 0; i < editorlist.length; ++i) {
    const b = editorlist[i]
    const shorttitle =
      b.title.length > 40 ? `${b.title.slice(0, 37)}...` : b.title
    gadgethyperlink(
      player,
      EDITOR_BOOKMARK_SCROLL_CHIP,
      `$CYAN${shorttitle}$WHITE  $ltgrey(${b.book})`,
      ['copytogame', 'hyperlink', b.id],
    )
  }
  const shared = gadgetstate(player)
  shared.scrollname = EDITOR_BOOKMARK_SCROLL_SCROLLNAME
  shared.scroll = gadgetcheckqueue(player)
}
