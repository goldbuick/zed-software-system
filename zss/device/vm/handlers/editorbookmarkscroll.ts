import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apitoast,
  registereditoropen,
  vmclearscroll,
  vmcodepagesnapshot,
} from 'zss/device/api'
import {
  GAME_BOOKMARK_TARGET_BOOK,
  type ZssEditorBookmark,
  normalizebookmarks,
} from 'zss/feature/bookmarks'
import { useTape } from 'zss/gadget/data/state'
import { createsid } from 'zss/mapping/guid'
import { deepcopy, isarray, ispresent, isstring } from 'zss/mapping/types'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import { memoryensurebookbyname } from 'zss/memory/books'
import { memoryeditorbookmarkscroll } from 'zss/memory/editorbookmarkscroll'
import type { CODE_PAGE } from 'zss/memory/types'

const editorbookmarkscrollcache: Record<string, ZssEditorBookmark[]> = {}

export function handleeditorbookmarkscroll(
  _vm: DEVICE,
  message: MESSAGE,
): void {
  let editorlist: ZssEditorBookmark[] = []
  if (isarray(message.data)) {
    const blob = normalizebookmarks({
      url: [],
      terminal: [],
      editor: message.data,
    })
    editorlist = blob.editor
  }
  editorbookmarkscrollcache[message.player] = editorlist
  memoryeditorbookmarkscroll(message.player, editorlist)
}

export function handleeditorbookmarkscrollpanel(
  vm: DEVICE,
  message: MESSAGE,
  path: string,
): void {
  switch (path) {
    case 'snapshotcurrent': {
      const ed = useTape.getState().editor
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
      apitoast(vm, message.player, `opened $green${entry.title}$white in editor`)
      vmclearscroll(vm, message.player)
      break
    }
    default:
      break
  }
}
