import {
  EDITOR_BOOKMARK_SCROLL_CHIP,
  EDITOR_BOOKMARK_SCROLL_SCROLLNAME,
  type ZssEditorBookmark,
} from 'zss/feature/bookmarks'
import { gadgetbbar, gadgethyperlink } from 'zss/gadget/data/api'
import {
  gadgetapplyscrolllines,
  scrolllinkescapefrag,
} from 'zss/gadget/data/applyscrolllines'

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
  const rows: string[] = []
  for (let i = 0; i < editorlist.length; ++i) {
    const b = editorlist[i]
    const shorttitle =
      b.title.length > 40 ? `${b.title.slice(0, 37)}...` : b.title
    const label = `$CYAN${shorttitle}$WHITE  $ltgrey(${b.book})`
    rows.push(
      `!copytogame hyperlink ${scrolllinkescapefrag(b.id)};${scrolllinkescapefrag(label)}`,
    )
  }
  gadgetapplyscrolllines(
    player,
    EDITOR_BOOKMARK_SCROLL_SCROLLNAME,
    rows.join('\n'),
    EDITOR_BOOKMARK_SCROLL_CHIP,
  )
}
