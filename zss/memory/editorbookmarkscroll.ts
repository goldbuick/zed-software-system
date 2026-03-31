import {
  EDITOR_BOOKMARK_SCROLL_CHIP,
  EDITOR_BOOKMARK_SCROLL_SCROLLNAME,
  type ZssEditorBookmark,
} from 'zss/feature/bookmarks'
import { DIVIDER } from 'zss/feature/writeui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { scrolllinkescapefrag } from 'zss/mapping/string'
import { isstring } from 'zss/mapping/types'

export function memoryeditorbookmarkscroll(
  player: string,
  editorlist: ZssEditorBookmark[],
  codepagename: string,
  codepagepath: string[],
): void {
  const lines: string[] = [
    `!snapshotcurrent hk s " S " 1 ${codepagepath.filter(isstring).join(' ')};save ${codepagename}`,
    DIVIDER,
  ]

  for (let i = 0; i < editorlist.length; ++i) {
    const bookmark = editorlist[i]
    const shorttitle =
      bookmark.title.length > 40
        ? `${bookmark.title.slice(0, 37)}...`
        : bookmark.title
    lines.push(
      `!copytogame hyperlink ${scrolllinkescapefrag(bookmark.id)};@${bookmark.type} ${scrolllinkescapefrag(shorttitle)}`,
    )
  }

  scrollwritelines(
    player,
    EDITOR_BOOKMARK_SCROLL_SCROLLNAME,
    lines.join('\n'),
    EDITOR_BOOKMARK_SCROLL_CHIP,
  )
}
