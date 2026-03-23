import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  registerbookmarkdelete,
  registerbookmarkscroll,
  registerbookmarkurlsave,
} from 'zss/device/api'
import { type ZssUrlBookmark, normalizebookmarks } from 'zss/feature/bookmarks'
import { isarray, isstring } from 'zss/mapping/types'
import { memorybookmarkscroll } from 'zss/memory/bookmarkscroll'
import { NAME } from 'zss/words/types'

function openbookmarkhref(href: string) {
  if (typeof globalThis === 'undefined' || !('location' in globalThis)) {
    return
  }
  const rootwithlocation = globalThis as { location: Location }
  rootwithlocation.location.href = href
}

export function handlebookmarkscroll(_vm: DEVICE, message: MESSAGE): void {
  let urllist: ZssUrlBookmark[] = []
  if (isarray(message.data)) {
    const blob = normalizebookmarks({
      url: message.data,
      terminal: [],
      editor: [],
    })
    urllist = blob.url
  }
  memorybookmarkscroll(message.player, urllist)
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
      registerbookmarkscroll(vm, message.player)
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
      openbookmarkhref(href)
      break
    }
    default:
      break
  }
}
