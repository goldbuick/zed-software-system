import { rxreplpushbatch } from 'zss/device/api'
import {
  rxreplclientdevice,
  rxreplclientreadownplayer,
  rxreplclientreadstream,
} from 'zss/device/rxreplclient'
import { ispresent } from 'zss/mapping/types'
import {
  boardfromboardstream,
  isboardstream,
  isflagsstream,
  isgadgetstream,
  ismemorystream,
  memoryconsumealldirty,
  memorymarkdirty,
  playerfromflagsstream,
  playerfromgadgetstream,
} from 'zss/memory/memorydirty'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

import {
  projectboardcodepage,
  projectgadget,
  projectmemory,
  projectplayerflags,
} from './memoryproject'

export function memorypushworkersyncpdirty(): void {
  const dirtyids = memoryconsumealldirty()
  const ownplayer = rxreplclientreadownplayer()
  for (let i = 0; i < dirtyids.length; ++i) {
    const stream = dirtyids[i]
    if (!ispresent(rxreplclientreadstream(stream))) {
      // not admitted yet — re-queue so admission + next tick still pushes.
      memorymarkdirty(stream)
      continue
    }
    if (ismemorystream(stream)) {
      const projection = projectmemory()
      rxreplpushbatch(rxreplclientdevice, ownplayer, {
        rows: [{ streamid: stream, document: projection }],
      })
      continue
    }
    if (isboardstream(stream)) {
      const boardid = boardfromboardstream(stream)
      if (!boardid) {
        continue
      }
      // worker hydrates `board:<id>` bodies into the main book (see
      // `memoryhydrate.hydrateboard`). To project back out, look the board
      // codepage up by id within the main book.
      const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
      if (!ispresent(mainbook)) {
        continue
      }
      const codepage = mainbook.pages.find(
        (page) =>
          page.id === boardid && page.stats?.type === CODE_PAGE_TYPE.BOARD,
      )
      if (!ispresent(codepage)) {
        continue
      }
      const document = projectboardcodepage(codepage)
      rxreplpushbatch(rxreplclientdevice, ownplayer, {
        rows: [{ streamid: stream, document }],
      })
      continue
    }
    if (isflagsstream(stream)) {
      const player = playerfromflagsstream(stream)
      if (!player) {
        continue
      }
      const document = projectplayerflags(player)
      rxreplpushbatch(rxreplclientdevice, ownplayer, {
        rows: [{ streamid: stream, document }],
      })
      continue
    }
    if (isgadgetstream(stream)) {
      const player = playerfromgadgetstream(stream)
      if (!player) {
        continue
      }
      const gadget = projectgadget(player)
      rxreplpushbatch(rxreplclientdevice, ownplayer, {
        rows: [{ streamid: stream, document: gadget }],
      })
      continue
    }
  }
}
