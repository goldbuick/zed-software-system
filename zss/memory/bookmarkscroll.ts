import {
  BOOKMARK_NAME_TARGET,
  BOOKMARK_SCROLL_CHIP,
  BOOKMARK_SCROLL_SCROLLNAME,
  ZssEditorBookmark,
  type ZssUrlBookmark,
} from 'zss/feature/bookmarks'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { scrolllinkescapefrag } from 'zss/mapping/string'

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
      `!editorbookmarkurl hyperlink ${scrolllinkescapefrag(b.id)};load @${b.type} ${scrolllinkescapefrag(b.title)}`,
    )
    lines.push(
      `!editorbookmarkdel hyperlink ${scrolllinkescapefrag(b.id)};$RED$192$196 DELETE`,
    )
    lines.push('$32')
  }

  lines.push(
    `$yellowurls $196$191`,
    `!${BOOKMARK_NAME_TARGET} text;name`,
    `!bookmarksave hyperlink bookmarksave;$192$196 save it`,
    '$32',
  )
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
