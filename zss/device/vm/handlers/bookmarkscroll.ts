import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  gadgetserverclearscroll,
  registerbookmarkdelete,
  registerbookmarkurlnavigate,
  registerbookmarkurlsave,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { normalizebookmarks } from 'zss/feature/bookmarks'
import { isarray, isstring } from 'zss/mapping/types'
import { memorybookmarkscroll } from 'zss/memory/bookmarkscroll'
import { NAME } from 'zss/words/types'

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
    case 'bookmarkdel': {
      let id: string | undefined
      if (isarray(message.data)) {
        const first = (message.data as unknown[])[0]
        if (isstring(first)) {
          id = first
        }
      } else if (isstring(message.data)) {
        id = message.data
      }
      if (!id) {
        return
      }
      registerbookmarkdelete(vm, message.player, id)
      gadgetserverclearscroll(SOFTWARE, message.player)
      break
    }
    case 'bookmarkurl': {
      let href: string | undefined
      if (isarray(message.data)) {
        const first = (message.data as unknown[])[0]
        if (isstring(first)) {
          href = first
        }
      } else if (isstring(message.data)) {
        href = message.data
      }
      if (!href?.trim()) {
        return
      }
      registerbookmarkurlnavigate(vm, message.player, href)
      break
    }
    default:
      break
  }
}
