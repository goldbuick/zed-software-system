import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apitoast,
  registereditoropen,
  vmclearscroll,
  vmcodepagesnapshot,
} from 'zss/device/api'
import { tapeeditorget } from 'zss/device/vm/tapeeditormirror'
import {
  EDITOR_BOOKMARK_SCROLL_OPENER_EMPTY,
  type Editorbookmarkscrollopener,
  GAME_BOOKMARK_TARGET_BOOK,
  type ZssEditorBookmark,
  normalizebookmarks,
  parseeditorbookmarkscrollopener,
} from 'zss/feature/bookmarks'
import { createsid } from 'zss/mapping/guid'
import { deepcopy, isarray, ispresent, isstring } from 'zss/mapping/types'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import { memoryensurebookbyname } from 'zss/memory/books'
import { memoryeditorbookmarkscroll } from 'zss/memory/editorbookmarkscroll'
import type { CODE_PAGE } from 'zss/memory/types'

const editorbookmarkscrollcache: Record<string, ZssEditorBookmark[]> = {}

type Bookmarksnapshotpayload = {
  book: string
  pathstrs: string[]
  edtype: string
  edtitle: string
}

function unpackeditorbookmarkscrollvm(message: MESSAGE): {
  editorlist: ZssEditorBookmark[]
  opener: Editorbookmarkscrollopener
} {
  const d = message.data
  if (!d || typeof d !== 'object' || isarray(d)) {
    return {
      editorlist: [],
      opener: EDITOR_BOOKMARK_SCROLL_OPENER_EMPTY,
    }
  }
  const env = d as Record<string, unknown>
  let editorlist: ZssEditorBookmark[] = []
  if (isarray(env.editor)) {
    const blob = normalizebookmarks({
      url: [],
      terminal: [],
      editor: env.editor,
    })
    editorlist = blob.editor
  }
  const opener = parseeditorbookmarkscrollopener(env.opener)
  return { editorlist, opener }
}

function tryparsebookmarksnapshotpayload(
  message: MESSAGE,
): Bookmarksnapshotpayload | undefined {
  if (!isarray(message.data) || message.data.length < 4) {
    return undefined
  }
  const raw = message.data as unknown[]
  const book = raw[0]
  const pathjson = raw[1]
  const edtype = raw[2]
  const edtitle = raw[3]
  if (
    !isstring(book) ||
    !isstring(pathjson) ||
    !isstring(edtype) ||
    !isstring(edtitle)
  ) {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(pathjson)
  } catch {
    return undefined
  }
  if (!isarray(parsed)) {
    return undefined
  }
  const pathstrs = parsed.filter(isstring)
  if (!pathstrs.length) {
    return undefined
  }
  return { book, pathstrs, edtype, edtitle }
}

export function handleeditorbookmarkscroll(
  _vm: DEVICE,
  message: MESSAGE,
): void {
  const { editorlist, opener } = unpackeditorbookmarkscrollvm(message)
  editorbookmarkscrollcache[message.player] = editorlist
  memoryeditorbookmarkscroll(message.player, editorlist, opener)
}

export function handleeditorbookmarkscrollpanel(
  vm: DEVICE,
  message: MESSAGE,
  path: string,
): void {
  switch (path) {
    case 'snapshotcurrent': {
      const frompanel = tryparsebookmarksnapshotpayload(message)
      if (frompanel) {
        vmcodepagesnapshot(
          vm,
          message.player,
          frompanel.book,
          frompanel.pathstrs,
          frompanel.edtype,
          frompanel.edtitle,
        )
        break
      }
      const ed = tapeeditorget(message.player)
      if (
        !ed.open ||
        !isstring(ed.book) ||
        !isarray(ed.path) ||
        ed.path.length === 0
      ) {
        apitoast(vm, message.player, 'no codepage open to bookmark')
        return
      }
      const pathstrs = ed.path.filter(isstring)
      if (!pathstrs.length) {
        apitoast(vm, message.player, 'no codepage open to bookmark')
        return
      }
      vmcodepagesnapshot(
        vm,
        message.player,
        ed.book,
        pathstrs,
        ed.type,
        ed.title,
      )
      break
    }
    case 'copytogame': {
      let pinid: string | undefined
      if (isarray(message.data)) {
        const first = (message.data as unknown[])[0]
        if (isstring(first)) {
          pinid = first
        }
      } else if (isstring(message.data)) {
        pinid = message.data
      }
      if (!pinid) {
        apitoast(vm, message.player, 'bookmark not found')
        return
      }
      const list = editorbookmarkscrollcache[message.player] ?? []
      const entry = list.find((b) => b.id === pinid)
      if (!entry) {
        apitoast(vm, message.player, 'bookmark not found')
        return
      }
      const raw = deepcopy(entry.codepage) as CODE_PAGE
      if (
        !ispresent(raw) ||
        typeof raw !== 'object' ||
        !isstring(raw.id) ||
        !isstring(raw.code)
      ) {
        apitoast(vm, message.player, 'invalid bookmark payload')
        return
      }
      raw.id = createsid()
      const gamebook = memoryensurebookbyname(GAME_BOOKMARK_TARGET_BOOK)
      if (!memorywritecodepage(gamebook, raw)) {
        apitoast(vm, message.player, 'copy to game failed')
        return
      }
      apitoast(vm, message.player, `copied $green${entry.title}$white to game`)
      vmclearscroll(vm, message.player)
      break
    }
    case 'openineditor': {
      let pinid: string | undefined
      if (isarray(message.data)) {
        const first = (message.data as unknown[])[0]
        if (isstring(first)) {
          pinid = first
        }
      } else if (isstring(message.data)) {
        pinid = message.data
      }
      if (!pinid) {
        apitoast(vm, message.player, 'bookmark not found')
        return
      }
      const list = editorbookmarkscrollcache[message.player] ?? []
      const entry = list.find((b) => b.id === pinid)
      if (!entry) {
        apitoast(vm, message.player, 'bookmark not found')
        return
      }
      const raw = deepcopy(entry.codepage) as CODE_PAGE
      if (
        !ispresent(raw) ||
        typeof raw !== 'object' ||
        !isstring(raw.id) ||
        !isstring(raw.code)
      ) {
        apitoast(vm, message.player, 'invalid bookmark payload')
        return
      }
      raw.id = createsid()
      if (!isstring(entry.book) || !entry.book.trim()) {
        apitoast(vm, message.player, 'invalid bookmark book')
        return
      }
      const targetbook = memoryensurebookbyname(entry.book)
      if (!memorywritecodepage(targetbook, raw)) {
        apitoast(vm, message.player, 'open in editor failed')
        return
      }
      registereditoropen(
        vm,
        message.player,
        entry.book,
        [raw.id],
        isstring(entry.type) ? entry.type : '',
        isstring(entry.title) ? entry.title : '',
        0,
      )
      apitoast(
        vm,
        message.player,
        `opened $green${entry.title}$white in editor`,
      )
      vmclearscroll(vm, message.player)
      break
    }
    default:
      break
  }
}
