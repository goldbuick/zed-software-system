import {
  BOOKMARK_SCROLL_CHIP,
  EDITOR_BOOKMARK_SCROLL_CHIP,
  type ZssEditorBookmark,
  type ZssUrlBookmark,
} from 'zss/feature/bookmarks'
import { zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryensuresoftwarebook } from 'zss/memory/books'
import { MEMORY_LABEL } from 'zss/memory/types'

export type BOOKMARK_LIST_CACHE =
  | {
      source: 'bookmarkscroll'
      urllist: ZssUrlBookmark[]
      codepagelist: ZssEditorBookmark[]
    }
  | {
      source: 'editorbookmarkscroll'
      editorlist: ZssEditorBookmark[]
      codepagename: string
      codepagepath: string[]
    }
  | {
      source: 'terminal'
    }

const listcache = new Map<string, BOOKMARK_LIST_CACHE>()

export function memorycachebookmarkscrolllist(
  player: string,
  urllist: ZssUrlBookmark[],
  codepagelist: ZssEditorBookmark[],
): void {
  listcache.set(player, {
    source: 'bookmarkscroll',
    urllist,
    codepagelist,
  })
}

export function memorycacheeditorbookmarkscrolllist(
  player: string,
  editorlist: ZssEditorBookmark[],
  codepagename: string,
  codepagepath: string[],
): void {
  listcache.set(player, {
    source: 'editorbookmarkscroll',
    editorlist,
    codepagename,
    codepagepath,
  })
}

export function memorycacheterminalbookmarkdelete(player: string): void {
  listcache.set(player, { source: 'terminal' })
}

export function memoryreadbookmarklistcache(
  player: string,
): BOOKMARK_LIST_CACHE | undefined {
  return listcache.get(player)
}

function labelforid(player: string, id: string): string {
  const cached = listcache.get(player)
  if (!cached) {
    return id
  }
  if (cached.source === 'bookmarkscroll') {
    for (let i = 0; i < cached.urllist.length; ++i) {
      if (cached.urllist[i].id === id) {
        return cached.urllist[i].name
      }
    }
    for (let i = 0; i < cached.codepagelist.length; ++i) {
      if (cached.codepagelist[i].id === id) {
        return cached.codepagelist[i].title
      }
    }
  }
  if (cached.source === 'editorbookmarkscroll') {
    for (let i = 0; i < cached.editorlist.length; ++i) {
      if (cached.editorlist[i].id === id) {
        return cached.editorlist[i].title
      }
    }
  }
  return id
}

/** Open yes/cancel scroll before removing a bookmark. */
export function memorybookmarkdeleteprompt(
  player: string,
  id: string,
  chip: typeof BOOKMARK_SCROLL_CHIP | typeof EDITOR_BOOKMARK_SCROLL_CHIP,
  labelfromcaller?: string,
): boolean {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return false
  }
  const label =
    isstring(labelfromcaller) && labelfromcaller.trim()
      ? labelfromcaller.trim()
      : labelforid(player, id)
  const confirmpath =
    chip === EDITOR_BOOKMARK_SCROLL_CHIP
      ? 'editorbookmarkdelconfirm'
      : 'bookmarkdelconfirm'
  const cancelpath =
    chip === EDITOR_BOOKMARK_SCROLL_CHIP
      ? 'editorbookmarkdelcancel'
      : 'bookmarkdelcancel'
  scrollwritelines(
    player,
    'delete bookmark?',
    zsstexttape(
      `$cyan${label}`,
      zsszedlinkline(`${confirmpath} hyperlink ${id}`, '$RED YES DELETE'),
      zsszedlinkline(`${cancelpath} hyperlink next`, 'cancel'),
    ),
    chip,
  )
  return true
}
