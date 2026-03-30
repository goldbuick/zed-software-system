import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  apitoast,
  registereditoropen,
  vmclearscroll,
  vmcodepagesnapshot,
} from 'zss/device/api'
import { GAME_BOOKMARK_TARGET_BOOK } from 'zss/feature/bookmarks'
import { createsid } from 'zss/mapping/guid'
import { deepcopy, isarray, ispresent, isstring } from 'zss/mapping/types'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import { memoryensurebookbyname } from 'zss/memory/books'
import { memoryreadcodepagebyid } from 'zss/memory/codepages'
import { memoryeditorbookmarkscroll } from 'zss/memory/editorbookmarkscroll'
import type { CODE_PAGE } from 'zss/memory/types'

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
  switch (path) {
    case 'snapshotcurrent':
      if (isarray(message.data)) {
        const [maybeid, maybeelement] = message.data
        if (isstring(maybeelement)) {
          // TODO
        } else if (isstring(maybeid)) {
          const maybecodepage = memoryreadcodepagebyid(maybeid)
          if (ispresent(maybecodepage)) {
            console.info(
              'handleeditorbookmarkscrollpanel snapshotcurrent',
              maybecodepage,
            )
          }
        }
      }
      break
    case 'copytogame': {
      console.info('handleeditorbookmarkscrollpanel copytogame', message.data)
      // let pinid: string | undefined
      // if (isarray(message.data)) {
      //   const first = (message.data as unknown[])[0]
      //   if (isstring(first)) {
      //     pinid = first
      //   }
      // } else if (isstring(message.data)) {
      //   pinid = message.data
      // }
      // if (!pinid) {
      //   apitoast(vm, message.player, 'bookmark not found')
      //   return
      // }
      // const list = editorbookmarkscrollcache[message.player] ?? []
      // const entry = list.find((b) => b.id === pinid)
      // if (!entry) {
      //   apitoast(vm, message.player, 'bookmark not found')
      //   return
      // }
      // const raw = deepcopy(entry.codepage) as CODE_PAGE
      // if (
      //   !ispresent(raw) ||
      //   typeof raw !== 'object' ||
      //   !isstring(raw.id) ||
      //   !isstring(raw.code)
      // ) {
      //   apitoast(vm, message.player, 'invalid bookmark payload')
      //   return
      // }
      // raw.id = createsid()
      // const gamebook = memoryensurebookbyname(GAME_BOOKMARK_TARGET_BOOK)
      // if (!memorywritecodepage(gamebook, raw)) {
      //   apitoast(vm, message.player, 'copy to game failed')
      //   return
      // }
      // apitoast(vm, message.player, `copied $green${entry.title}$white to game`)
      // vmclearscroll(vm, message.player)
      break
    }
    default:
      break
  }
}
