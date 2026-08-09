import type { DEVICE } from 'zss/device'
import {
  apitoast,
  registerbookmarkcodepagecopytogame,
  registerbookmarkdelete,
  registerbookmarkurlnavigate,
  registerbookmarkurlsave,
  registerbookmarkurlsaveover,
} from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { BOOKMARK_SCROLL_CHIP, normalizebookmarks } from 'zss/feature/bookmarks'
import { gadgetclearscroll } from 'zss/gadget/data/api'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memorybookmarkdeleteprompt,
  memorycacheterminalbookmarkdelete,
  memoryreadbookmarklistcache,
} from 'zss/memory/bookmarkdeleteconfirm'
import {
  memorybookmarkscroll,
  memorymainbookisempty,
} from 'zss/memory/bookmarkscroll'
import { memoryensuresoftwarebook } from 'zss/memory/books'
import { memoryeditorbookmarkscroll } from 'zss/memory/editorbookmarkscroll'
import { MEMORY_LABEL } from 'zss/memory/types'
import { NAME } from 'zss/words/types'

function readstringarg(message: MESSAGE): string | undefined {
  if (isarray(message.data)) {
    const first = (message.data as unknown[])[0]
    if (isstring(first)) {
      return first
    }
  } else if (isstring(message.data)) {
    return message.data
  }
  return undefined
}

function restorebookmarklist(player: string): void {
  const cached = memoryreadbookmarklistcache(player)
  if (!cached || cached.source === 'terminal') {
    gadgetclearscroll(player)
    return
  }
  if (cached.source === 'bookmarkscroll') {
    memorybookmarkscroll(player, cached.urllist, cached.codepagelist)
    return
  }
  memoryeditorbookmarkscroll(
    player,
    cached.editorlist,
    cached.codepagename,
    cached.codepagepath,
  )
}

export function handlebookmarkscroll(vm: DEVICE, message: MESSAGE): void {
  // register:bookmarkscroll skips memoryruncli; gadget state + gadgetsynctick need MAIN.
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    apitoast(vm, message.player, 'gadget scroll: need main book')
    return
  }
  if (isarray(message.data)) {
    const [urllist, codepagelist] = message.data as [any[], any[]]
    const blob = normalizebookmarks({
      url: urllist,
      editor: codepagelist,
      terminal: [],
    })
    memorybookmarkscroll(message.player, blob.url, blob.editor)
  }
}

/** Terminal pin delete: open confirm scroll (label from main thread). */
export function handlebookmarkdeleteprompt(vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [id, label] = message.data as unknown[]
  if (!isstring(id) || !id) {
    return
  }
  memorycacheterminalbookmarkdelete(message.player)
  if (
    !memorybookmarkdeleteprompt(
      message.player,
      id,
      BOOKMARK_SCROLL_CHIP,
      isstring(label) ? label : id,
    )
  ) {
    apitoast(vm, message.player, 'gadget scroll: need main book')
  }
}

export function handlebookmarkscrollpanel(
  vm: DEVICE,
  message: MESSAGE,
  path: string,
): void {
  switch (NAME(path)) {
    case 'bookmarksave':
      if (memorymainbookisempty()) {
        apitoast(vm, message.player, 'bookmark save: main book is empty')
        return
      }
      registerbookmarkurlsave(vm, message.player)
      break
    case 'bookmarksaveover': {
      if (memorymainbookisempty()) {
        apitoast(vm, message.player, 'bookmark save: main book is empty')
        return
      }
      const id = readstringarg(message)
      if (!id) {
        return
      }
      registerbookmarkurlsaveover(vm, message.player, id)
      break
    }
    case 'bookmarkdel':
    case 'editorbookmarkdel': {
      const id = readstringarg(message)
      if (!id) {
        return
      }
      if (
        !memorybookmarkdeleteprompt(message.player, id, BOOKMARK_SCROLL_CHIP)
      ) {
        apitoast(vm, message.player, 'gadget scroll: need main book')
      }
      break
    }
    case 'bookmarkdelconfirm':
    case 'editorbookmarkdelconfirm': {
      const id = readstringarg(message)
      if (!id) {
        return
      }
      registerbookmarkdelete(vm, message.player, id)
      break
    }
    case 'bookmarkdelcancel':
    case 'editorbookmarkdelcancel':
      restorebookmarklist(message.player)
      break
    case 'bookmarkurl': {
      const href = readstringarg(message)
      if (!href?.trim()) {
        return
      }
      registerbookmarkurlnavigate(vm, message.player, href)
      break
    }
    case 'editorbookmarkurl': {
      const id = readstringarg(message)
      if (!id) {
        return
      }
      registerbookmarkcodepagecopytogame(vm, message.player, id)
      break
    }
    default:
      break
  }
}
