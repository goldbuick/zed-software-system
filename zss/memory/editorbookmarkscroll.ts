import {
  EDITOR_BOOKMARK_SCROLL_CHIP,
  EDITOR_BOOKMARK_SCROLL_SCROLLNAME,
  type Editorbookmarkscrollopener,
  type ZssEditorBookmark,
} from 'zss/feature/bookmarks'
import { gadgetbbar, gadgethyperlink } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { scrolllinkescapefrag } from 'zss/mapping/string'
import { isarray, isstring } from 'zss/mapping/types'
import type { WORD } from 'zss/words/types'

export function memoryeditorbookmarkscroll(
  player: string,
  editorlist: ZssEditorBookmark[],
  opener: Editorbookmarkscrollopener,
): void {
  let label = '$GREENbookmark current page'
  const words: WORD[] = ['snapshotcurrent', 'hk', 's', ` S `, '1']
  if (
    isstring(opener.book) &&
    opener.book.trim().length > 0 &&
    isarray(opener.path) &&
    opener.path.length > 0
  ) {
    const pathstrs = opener.path.filter(isstring)
    if (pathstrs.length) {
      const title = isstring(opener.title) ? opener.title : ''
      const short = title.length > 40 ? `${title.slice(0, 37)}...` : title
      const display = short.length ? short : (pathstrs[0] ?? 'page')
      label = `$GREENbookmark $white${display}$GREEN  current page`
      words.push(
        opener.book,
        JSON.stringify(pathstrs),
        isstring(opener.type) ? opener.type : '',
        title,
      )
    }
  }
  gadgethyperlink(player, EDITOR_BOOKMARK_SCROLL_CHIP, label, words)
  gadgetbbar(player, 10)
  const rows: string[] = []
  for (let i = 0; i < editorlist.length; ++i) {
    const b = editorlist[i]
    const shorttitle =
      b.title.length > 40 ? `${b.title.slice(0, 37)}...` : b.title
    const rowlabel = `$CYAN${shorttitle}$WHITE  $ltgrey(${b.book})`
    rows.push(
      `!openineditor hyperlink ${scrolllinkescapefrag(b.id)};${scrolllinkescapefrag(`$GREENOPEN$WHITE ${shorttitle}  $ltgrey(${b.book})`)}`,
    )
    rows.push(
      `!copytogame hyperlink ${scrolllinkescapefrag(b.id)};${scrolllinkescapefrag(rowlabel)}`,
    )
  }
  scrollwritelines(
    player,
    EDITOR_BOOKMARK_SCROLL_SCROLLNAME,
    rows.join('\n'),
    EDITOR_BOOKMARK_SCROLL_CHIP,
  )
}
