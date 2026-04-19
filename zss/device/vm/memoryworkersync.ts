/*
memoryworkersync: worker-side push loop. Counterpart to `memorysync.ts`'s
`memorysyncpushdirty`; pushes full-document rows via `rxreplpushbatch` so the
sim merges into canonical MEMORY (Strategy B).

After the worker runs `memorytickmain`, dirty bits (from `zss/memory/*`)
identify changed streams. This module drains them and emits one batch row per
admitted stream:

- `memory` stream: `projectmemory()` snapshot.
- `board:<id>` streams: board codepage projection from the main book.

Only streams with a registered rxrepl client shadow participate
(`rxreplclientreadstream`); others are re-queued until admission.

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
  MEMORY_STREAM_ID,
  memoryconsumealldirty,
  memorymarkdirty,
} from 'zss/memory/memorydirty'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'

import { projectboardcodepage, projectmemory } from './memoryproject'

export function memoryworkerpushdirty(): void {
  const dirtyids = memoryconsumealldirty()
  for (let i = 0; i < dirtyids.length; ++i) {
    const streamid = dirtyids[i]
    if (!ispresent(rxreplclientreadstream(streamid))) {
      // not admitted yet — re-queue so admission + next tick still pushes.
      memorymarkdirty(streamid)
      continue
    }
    if (streamid === MEMORY_STREAM_ID) {
      const projection = projectmemory()
      rxreplpushbatch(rxreplclientdevice, rxreplclientreadownplayer(), {
        rows: [{ streamid, document: projection }],
      })
      continue
    }
    if (!streamid.startsWith('board:')) {
      continue
    }
    const boardid = streamid.slice('board:'.length)
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
    const projection = projectboardcodepage(codepage)
    rxreplpushbatch(rxreplclientdevice, rxreplclientreadownplayer(), {
      rows: [{ streamid, document: projection }],
    })
  }
}
