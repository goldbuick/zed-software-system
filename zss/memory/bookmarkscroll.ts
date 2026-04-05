import {
  BOOKMARK_NAME_TARGET,
  BOOKMARK_SCROLL_CHIP,
  BOOKMARK_SCROLL_SCROLLNAME,
  ZssEditorBookmark,
  type ZssUrlBookmark,
} from 'zss/feature/bookmarks'
import { zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'

export function memorybookmarkscroll(
  player: string,
  urllist: ZssUrlBookmark[],
  codepagelist: ZssEditorBookmark[],
): void {
  const lines: string[] = []

  if (codepagelist.length > 0) {
    lines.push(`$yellowcodepages $196$191`)
  }
  for (let i = 0; i < codepagelist.length; ++i) {
    const b = codepagelist[i]
    lines.push(
      zsszedlinkline(
        `editorbookmarkurl hyperlink ${b.id}`,
        `load @${b.type} ${b.title}`,
      ),
    )
    lines.push(
      zsszedlinkline(
        `editorbookmarkdel hyperlink ${b.id}`,
        '$RED$192$196 DELETE',
      ),
    )
    lines.push('$32')
  }

  lines.push(
    `$yellowurls $196$191`,
    zsszedlinkline(`${BOOKMARK_NAME_TARGET} text`, 'name'),
    zsszedlinkline('bookmarksave hyperlink bookmarksave', '$192$196 save it'),
    '$32',
  )
  for (let i = 0; i < urllist.length; ++i) {
    const b = urllist[i]
    lines.push(
      zsszedlinkline(`bookmarkurl hyperlink ${b.href}`, `$CYANload ${b.name}`),
    )
    lines.push(
      zsszedlinkline(`bookmarkdel hyperlink ${b.id}`, '$RED$192$196 DELETE'),
    )
    lines.push('$32')
  }

  scrollwritelines(
    player,
    BOOKMARK_SCROLL_SCROLLNAME,
    zsstexttape(lines),
    BOOKMARK_SCROLL_CHIP,
  )
}
