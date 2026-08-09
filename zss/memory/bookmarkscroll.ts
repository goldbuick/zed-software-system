import {
  BOOKMARK_NAME_TARGET,
  BOOKMARK_SCROLL_CHIP,
  BOOKMARK_SCROLL_SCROLLNAME,
  ZssEditorBookmark,
  type ZssUrlBookmark,
} from 'zss/feature/bookmarks'
import { zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { ispresent } from 'zss/mapping/types'
import { memorycachebookmarkscrolllist } from 'zss/memory/bookmarkdeleteconfirm'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

/** True when MAIN is missing or has no codepages (fresh ensure with nothing authored). */
export function memorymainbookisempty(): boolean {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  return !ispresent(mainbook) || mainbook.pages.length === 0
}

export function memorybookmarkscroll(
  player: string,
  urllist: ZssUrlBookmark[],
  codepagelist: ZssEditorBookmark[],
): void {
  memorycachebookmarkscrolllist(player, urllist, codepagelist)
  const lines: string[] = []
  const canurlsave = !memorymainbookisempty()

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
        `editorbookmarkdel hyperlink next ${b.id}`,
        '$RED$192$196 DELETE',
      ),
    )
    lines.push('$32')
  }

  lines.push(`$yellowurls $196$191`)
  if (canurlsave) {
    lines.push(
      zsszedlinkline(`${BOOKMARK_NAME_TARGET} text`, 'name'),
      zsszedlinkline('bookmarksave hyperlink bookmarksave', '$192$196 save it'),
      '$32',
    )
  }
  for (let i = 0; i < urllist.length; ++i) {
    const b = urllist[i]
    lines.push(
      zsszedlinkline(`bookmarkurl hyperlink ${b.href}`, `$CYANload ${b.name}`),
    )
    if (canurlsave) {
      lines.push(
        zsszedlinkline(
          `bookmarksaveover hyperlink ${b.id}`,
          '$192$196 save over',
        ),
      )
    }
    lines.push(
      zsszedlinkline(
        `bookmarkdel hyperlink next ${b.id}`,
        '$RED$192$196 DELETE',
      ),
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
