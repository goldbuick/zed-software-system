import type { DEVICE } from 'zss/device'
import {
  registerbookmarkcodepagecopytogame,
  registerbookmarkcodepagesave,
  registerbookmarkcodepagesaveover,
  registerbookmarkdelete,
} from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadcodepagename,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memoryreadcodepagebyaddress } from 'zss/memory/codepages'
import { memoryeditorbookmarkscroll } from 'zss/memory/editorbookmarkscroll'
import { NAME } from 'zss/words/types'

export function handleeditorbookmarkscroll(
  _vm: DEVICE,
  message: MESSAGE,
): void {
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
          registerbookmarkdelete(vm, message.player, id)
        }
      }
      break
    default:
      break
  }
}
