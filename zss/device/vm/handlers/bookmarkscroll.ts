import type { DEVICE } from 'zss/device'
import {
  registerbookmarkcodepagecopytogame,
  registerbookmarkdelete,
  registerbookmarkurlnavigate,
  registerbookmarkurlsave,
  registerbookmarkurlsaveover,
  vmclearscroll,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import type { MESSAGE } from 'zss/device/types'
import { normalizebookmarks } from 'zss/feature/bookmarks'
import { isarray, isstring } from 'zss/mapping/types'
import { memorybookmarkscroll } from 'zss/memory/bookmarkscroll'
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

export function handlebookmarkscroll(_vm: DEVICE, message: MESSAGE): void {
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

export function handlebookmarkscrollpanel(
  vm: DEVICE,
  message: MESSAGE,
  path: string,
): void {
  switch (NAME(path)) {
    case 'bookmarksave':
      registerbookmarkurlsave(vm, message.player)
      break
    case 'bookmarksaveover': {
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
      registerbookmarkdelete(vm, message.player, id)
      vmclearscroll(SOFTWARE, message.player)
      break
    }
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
