/*
memoryworkersync: worker-side push loop. Counterpart to `memorysync.ts`'s
`memorysyncpushdirty`; pushes full-document rows via `rxreplpushbatch` so the
sim merges into canonical MEMORY (Strategy B).

After the worker runs `memorytickmain` (boards only; sim runs `memorytickloaders`), dirty bits (from `zss/memory/*`)
identify changed streams. This module drains them and emits one batch row per
admitted stream:

- `memory` stream: `projectmemory()` snapshot.
- `board:<id>` streams: board codepage projection from the main book.
- `gadget:<player>` streams: `projectgadget(player)` (`GADGET_STATE`).
- `flags:<player>` streams: `projectplayerflags(player)` (main book flags bag).

Most streams require a registered rxrepl client shadow (`rxreplclientreadstream`);
`gadget:<pid>` is pushed even without a local shadow so the elected runner can
publish other viewport players' gadget docs (their rxrepl rows hydrate on main).

Hydration of inbound traffic is separate (`memoryhydrate`); it runs inside
`memorywithsilentwrites`, so it does not re-fire consumed dirty bits.
*/
import { rxreplpushbatch } from 'zss/device/api'
import {
  rxreplclientdevice,
  rxreplclientreadownplayer,
  rxreplclientreadstream,
} from 'zss/device/rxreplclient'
import { ispresent } from 'zss/mapping/types'
import {
  boardidfromboardstream,
  isboardstream,
  isflagsstream,
  isgadgetstream,
  ismemorystream,
  memoryconsumealldirty,
  memorymarkdirty,
  playeridfromflagsstream,
  playeridfromgadgetstream,
} from 'zss/memory/memorydirty'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

import {
  projectboardcodepage,
  projectgadget,
  projectmemory,
  projectplayerflags,
} from './memoryproject'

export function memoryworkerpushdirty(): void {
  const dirtyids = memoryconsumealldirty()
  const ownplayer = rxreplclientreadownplayer()
  for (let i = 0; i < dirtyids.length; ++i) {
    const stream = dirtyids[i]
    if (isgadgetstream(stream)) {
      const player = playeridfromgadgetstream(stream)
      if (!player) {
        continue
      }
      const gadget = projectgadget(player)
      rxreplpushbatch(rxreplclientdevice, ownplayer, {
        rows: [{ streamid: stream, gadget }],
      })
      continue
    }
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
      const boardid = boardidfromboardstream(stream)
      if (!boardid) {
        continue
      }
      // worker hydrates incoming boards into the main book (see
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
      const player = playeridfromflagsstream(stream)
      if (!player) {
        continue
      }
      const document = projectplayerflags(player)
      rxreplpushbatch(rxreplclientdevice, ownplayer, {
        rows: [{ streamid: stream, document }],
      })
      continue
    }
  }
}
