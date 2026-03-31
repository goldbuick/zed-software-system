import type { DEVICE } from 'zss/device'
import {
  type MESSAGE,
  registerbookmarkcodepagecopytogame,
  registerbookmarkcodepagesave,
  registerbookmarkdelete,
} from 'zss/device/api'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadcodepagename,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memoryreadcodepagebyid } from 'zss/memory/codepages'
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

export function handleeditorbookmarkscrollpanel(
  vm: DEVICE,
  message: MESSAGE,
  path: string,
): void {
  switch (NAME(path)) {
    case 'snapshotcurrent':
      if (isarray(message.data)) {
        const [maybeid, maybeelement] = message.data
        if (isstring(maybeelement)) {
          // TODO
        } else if (isstring(maybeid)) {
          const maybecodepage = memoryreadcodepagebyid(maybeid)
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
    case 'editorbookmarkdel':
      if (isarray(message.data)) {
        const [id] = message.data
        if (isstring(id)) {
          registerbookmarkdelete(vm, message.player, id)
        }
      }
      break
    default:
      console.info('handleeditorbookmarkscrollpanel', path)
      break
  }
}
