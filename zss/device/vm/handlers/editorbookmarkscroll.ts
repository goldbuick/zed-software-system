import type { DEVICE } from 'zss/device'
import {
  apitoast,
  registerbookmarkcodepagecopytogame,
  registerbookmarkcodepagesave,
  registerbookmarkcodepagesaveover,
  registerbookmarkdelete,
} from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { EDITOR_BOOKMARK_SCROLL_CHIP } from 'zss/feature/bookmarks'
import { gadgetclearscroll } from 'zss/gadget/data/api'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memorybookmarkdeleteprompt,
  memoryreadbookmarklistcache,
} from 'zss/memory/bookmarkdeleteconfirm'
import { memorybookmarkscroll } from 'zss/memory/bookmarkscroll'
import { memoryensuresoftwarebook } from 'zss/memory/books'
import {
  memoryreadcodepagename,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memoryreadcodepagebyaddress } from 'zss/memory/codepages'
import { memoryeditorbookmarkscroll } from 'zss/memory/editorbookmarkscroll'
import { MEMORY_LABEL } from 'zss/memory/types'
import { NAME } from 'zss/words/types'

export function handleeditorbookmarkscroll(vm: DEVICE, message: MESSAGE): void {
  // register:editorbookmarkscroll skips memoryruncli; gadget state + gadgetsynctick need MAIN.
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    apitoast(vm, message.player, 'gadget scroll: need main book')
    return
  }
  if (isarray(message.data)) {
    const [editorlist, codepagename, codepagepath] = message.data
    if (
      isarray(editorlist) &&
      isstring(codepagename) &&
      isarray(codepagepath)
    ) {
      memoryeditorbookmarkscroll(
        message.player,
        editorlist,
        codepagename,
        codepagepath,
      )
    }
  }
}

function readcodepageaddress(data: unknown): string | undefined {
  if (!isarray(data)) {
    return undefined
  }
  const words = data as unknown[]
  for (let i = 0; i < words.length; ++i) {
    const word = words[i]
    if (isstring(word) && word.length > 0) {
      return word
    }
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

export function handleeditorbookmarkscrollpanel(
  vm: DEVICE,
  message: MESSAGE,
  path: string,
): void {
  switch (NAME(path)) {
    case 'snapshotcurrent':
      if (isarray(message.data)) {
        const [maybeaddress, maybeelement] = message.data
        if (isstring(maybeelement)) {
          // TODO
        } else if (isstring(maybeaddress)) {
          const maybecodepage = memoryreadcodepagebyaddress(maybeaddress)
          if (ispresent(maybecodepage)) {
            registerbookmarkcodepagesave(
              vm,
              message.player,
              memoryreadcodepagetypeasstring(maybecodepage),
              memoryreadcodepagename(maybecodepage),
              maybecodepage,
            )
          }
        }
      }
      break
    case 'copytogame': {
      if (isarray(message.data)) {
        const [id] = message.data
        if (isstring(id)) {
          registerbookmarkcodepagecopytogame(vm, message.player, id)
        }
      }
      break
    }
    case 'editorsaveover': {
      if (isarray(message.data)) {
        const [id, ...rest] = message.data as unknown[]
        if (!isstring(id)) {
          break
        }
        const address = readcodepageaddress(rest)
        if (!address) {
          break
        }
        const maybecodepage = memoryreadcodepagebyaddress(address)
        if (ispresent(maybecodepage)) {
          registerbookmarkcodepagesaveover(
            vm,
            message.player,
            id,
            memoryreadcodepagetypeasstring(maybecodepage),
            memoryreadcodepagename(maybecodepage),
            maybecodepage,
          )
        }
      }
      break
    }
    case 'editorbookmarkdel':
      if (isarray(message.data)) {
        const [id] = message.data
        if (isstring(id)) {
          if (
            !memorybookmarkdeleteprompt(
              message.player,
              id,
              EDITOR_BOOKMARK_SCROLL_CHIP,
            )
          ) {
            apitoast(vm, message.player, 'gadget scroll: need main book')
          }
        }
      }
      break
    case 'editorbookmarkdelconfirm':
      if (isarray(message.data)) {
        const [id] = message.data
        if (isstring(id)) {
          registerbookmarkdelete(vm, message.player, id)
        }
      }
      break
    case 'editorbookmarkdelcancel':
      restorebookmarklist(message.player)
      break
    default:
      break
  }
}
