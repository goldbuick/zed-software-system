import {
  BOOKMARK_NAME_TARGET,
  BOOKMARK_SCROLL_CHIP,
  BOOKMARK_SCROLL_SCROLLNAME,
  type ZssUrlBookmark,
} from 'zss/feature/bookmarks'
import { DIVIDER } from 'zss/feature/writeui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { scrolllinkescapefrag } from 'zss/mapping/string'

export function memorybookmarkscroll(
  player: string,
  urllist: ZssUrlBookmark[],
): void {
  const lines: string[] = [
    `!${BOOKMARK_NAME_TARGET} text;name`,
    `!bookmarksave hyperlink bookmarksave;$192$196 save it`,
    DIVIDER,
  ]

  for (let i = 0; i < urllist.length; ++i) {
    const b = urllist[i]
    lines.push(
      `!bookmarkurl hyperlink ${scrolllinkescapefrag(b.href)};${scrolllinkescapefrag(`$CYANload ${b.name}`)}`,
    )
    lines.push(
      `!bookmarkdel hyperlink ${scrolllinkescapefrag(b.id)};$RED$192$196 DELETE`,
    )
    lines.push('$32')
  }

  scrollwritelines(
    player,
    BOOKMARK_SCROLL_SCROLLNAME,
    lines.join('\n'),
    BOOKMARK_SCROLL_CHIP,
  )
}
