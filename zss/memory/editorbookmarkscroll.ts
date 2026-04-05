import {
  EDITOR_BOOKMARK_SCROLL_CHIP,
  EDITOR_BOOKMARK_SCROLL_SCROLLNAME,
  type ZssEditorBookmark,
} from 'zss/feature/bookmarks'
import { DIVIDER } from 'zss/feature/zsstextui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { scrolllinkescapefrag } from 'zss/mapping/string'
import { isstring } from 'zss/mapping/types'

export function memoryeditorbookmarkshorttitle(
  bookmark: ZssEditorBookmark,
): string {
  return bookmark.title.length > 40
    ? `${bookmark.title.slice(0, 37)}...`
    : bookmark.title
}

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
    const shorttitle = memoryeditorbookmarkshorttitle(bookmark)
    lines.push(
      `!copytogame hyperlink ${scrolllinkescapefrag(bookmark.id)};load @${bookmark.type} ${scrolllinkescapefrag(shorttitle)}`,
    )
    lines.push(
      `!editorbookmarkdel hyperlink ${scrolllinkescapefrag(bookmark.id)};$RED$192$196 DELETE`,
    )
    lines.push('$32')
  }

  scrollwritelines(
    player,
    EDITOR_BOOKMARK_SCROLL_SCROLLNAME,
    lines.join('\n'),
    EDITOR_BOOKMARK_SCROLL_CHIP,
  )
}
