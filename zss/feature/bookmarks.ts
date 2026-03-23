import { storagereadvars, storagewritevar } from 'zss/feature/storage'
import { createpid } from 'zss/mapping/guid'
import { deepcopy, isstring } from 'zss/mapping/types'
import { metakey } from 'zss/words/system'

export const ZSS_BOOKMARKS_KEY = 'zss_bookmarks'

export const BOOKMARK_SCROLL_SCROLLNAME = 'bookmarks'

/** Hub route for terminal pin rows (`!!hk …`); register inner target `runbookmark`. */
export const RUN_BOOKMARK_MSG = 'register:runbookmark'

/** Panel / modem chip for URL bookmark scroll name field (client-side Yjs). */
export const BOOKMARK_SCROLL_CHIP = 'bookmarkscroll'

export const BOOKMARK_NAME_TARGET = 'name'

/** Panel chip for editor bookmark scroll (list + snapshot + copy to game). */
export const EDITOR_BOOKMARK_SCROLL_CHIP = 'editorbookmarkscroll'

export const EDITOR_BOOKMARK_SCROLL_SCROLLNAME = 'editorbookmarks'

/** Destination book name for “copy bookmarked codepage to game” action. */
export const GAME_BOOKMARK_TARGET_BOOK = 'game'

export const BOOKMARKS_VERSION = 1

/** Max terminal pins stored and shown (newest kept when over cap). */
export const TERMINAL_PIN_MAX = 6

export type ZssUrlBookmark = {
  kind: 'url'
  id: string
  name: string
  href: string
  createdat: number
}

export type ZssTerminalBookmark = {
  kind: 'terminal'
  id: string
  text: string
  createdat: number
}

export type ZssEditorBookmark = {
  kind: 'editor'
  id: string
  book: string
  path: string[]
  type: string
  title: string
  codepage: unknown
  createdat: number
}

export type ZssBookmark =
  | ZssUrlBookmark
  | ZssTerminalBookmark
  | ZssEditorBookmark

export type ZssBookmarksBlob = {
  version: number
  url: ZssUrlBookmark[]
  terminal: ZssTerminalBookmark[]
  editor: ZssEditorBookmark[]
}

export function capterminalbookmarklist(
  list: ZssTerminalBookmark[],
): ZssTerminalBookmark[] {
  if (list.length <= TERMINAL_PIN_MAX) {
    return list
  }
  return list.slice(-TERMINAL_PIN_MAX)
}

export function normalizebookmarks(raw: unknown): ZssBookmarksBlob {
  if (!raw || typeof raw !== 'object') {
    return { version: BOOKMARKS_VERSION, url: [], terminal: [], editor: [] }
  }
  const o = raw as Record<string, unknown>
  const url = Array.isArray(o.url) ? o.url : []
  const terminal = Array.isArray(o.terminal) ? o.terminal : []
  const editor = Array.isArray(o.editor) ? o.editor : []
  const terminalfiltered = terminal.filter(isterminalbookmark)
  return {
    version: BOOKMARKS_VERSION,
    url: url.filter(isurlbookmark),
    terminal: capterminalbookmarklist(terminalfiltered),
    editor: editor.filter(iseditorbookmark),
  }
}

function isurlbookmark(x: unknown): x is ZssUrlBookmark {
  if (!x || typeof x !== 'object') {
    return false
  }
  const b = x as ZssUrlBookmark
  return (
    b.kind === 'url' &&
    isstring(b.id) &&
    isstring(b.name) &&
    isstring(b.href) &&
    typeof b.createdat === 'number'
  )
}

function isterminalbookmark(x: unknown): x is ZssTerminalBookmark {
  if (!x || typeof x !== 'object') {
    return false
  }
  const b = x as ZssTerminalBookmark
  return (
    b.kind === 'terminal' &&
    isstring(b.id) &&
    isstring(b.text) &&
    typeof b.createdat === 'number'
  )
}

function iseditorbookmark(x: unknown): x is ZssEditorBookmark {
  if (!x || typeof x !== 'object') {
    return false
  }
  const b = x as ZssEditorBookmark
  return (
    b.kind === 'editor' &&
    isstring(b.id) &&
    isstring(b.book) &&
    Array.isArray(b.path) &&
    b.path.every(isstring) &&
    isstring(b.type) &&
    isstring(b.title) &&
    typeof b.createdat === 'number'
  )
}

export async function readbookmarksfromstorage(): Promise<ZssBookmarksBlob> {
  const vars = await storagereadvars()
  const raw = vars[ZSS_BOOKMARKS_KEY]
  return normalizebookmarks(raw)
}

export async function writebookmarksblob(
  blob: ZssBookmarksBlob,
): Promise<void> {
  await storagewritevar(ZSS_BOOKMARKS_KEY, blob)
}

export async function mergebookmarksintostorage(
  updater: (prev: ZssBookmarksBlob) => ZssBookmarksBlob,
): Promise<ZssBookmarksBlob> {
  const prev = await readbookmarksfromstorage()
  const next = updater(prev)
  await writebookmarksblob(next)
  return next
}

export async function appendurlbookmark(
  name: string,
  href: string,
): Promise<ZssUrlBookmark> {
  const entry: ZssUrlBookmark = {
    kind: 'url',
    id: createpid(),
    name: name.trim(),
    href,
    createdat: Date.now(),
  }
  await mergebookmarksintostorage((prev) => ({
    ...prev,
    url: [...prev.url, entry],
  }))
  return entry
}

export async function appendterminalbookmark(
  text: string,
): Promise<ZssTerminalBookmark> {
  const trimmed = text.trim()
  const entry: ZssTerminalBookmark = {
    kind: 'terminal',
    id: createpid(),
    text: trimmed,
    createdat: Date.now(),
  }
  await mergebookmarksintostorage((prev) => ({
    ...prev,
    terminal: capterminalbookmarklist([...prev.terminal, entry]),
  }))
  return entry
}

export async function appendeditorbookmark(args: {
  book: string
  path: string[]
  type: string
  title: string
  codepage: unknown
}): Promise<ZssEditorBookmark> {
  const entry: ZssEditorBookmark = {
    kind: 'editor',
    id: createpid(),
    book: args.book,
    path: [...args.path],
    type: args.type,
    title: args.title,
    codepage: deepcopy(args.codepage),
    createdat: Date.now(),
  }
  await mergebookmarksintostorage((prev) => ({
    ...prev,
    editor: [...prev.editor, entry],
  }))
  return entry
}

export async function removebookmarkbyid(id: string): Promise<boolean> {
  let found = false
  await mergebookmarksintostorage((prev) => {
    const url = prev.url.filter((b) => {
      if (b.id === id) {
        found = true
        return false
      }
      return true
    })
    const terminal = prev.terminal.filter((b) => {
      if (b.id === id) {
        found = true
        return false
      }
      return true
    })
    const editor = prev.editor.filter((b) => {
      if (b.id === id) {
        found = true
        return false
      }
      return true
    })
    return { ...prev, url, terminal, editor }
  })
  return found
}

/** One-line label for the pin row (no `;` / newlines — they break terminal hyperlink parse). */
export function terminalbookmarkpindisplaylabel(text: string): string {
  const oneline = text.replace(/[\r\n;]/g, ' ').trim()
  return oneline.length > 52 ? `${oneline.slice(0, 49)}...` : oneline || '*'
}

export function terminalbookmarkpinline(
  b: ZssTerminalBookmark,
  pinindex: number,
): string {
  const label = terminalbookmarkpindisplaylabel(b.text)
  const n = pinindex + 1
  return `$ONCYAN$BLACK ${metakey}+${n} $ONDKBLUE$WHITE ${label}`
}

export function readterminalbookmarkdisplaylines(
  blob: ZssBookmarksBlob,
): string[] {
  return blob.terminal.map((b, i) => terminalbookmarkpinline(b, i))
}
