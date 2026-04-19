/*
memoryworkersync: worker-side push loop. Counterpart to `memorysync.ts`'s
`memorysyncpushdirty` but emits `jsonsyncclientedit` instead of
`jsonsyncserverupdate`.

Phase 2 of the boardrunner authoritative-tick plan: after the worker runs its
local `memorytickmain`, any meaningful MEMORY/board mutation has flipped a
dirty bit (via the helpers instrumented in `zss/memory/*`). This module
drains the dirty set and turns each into a clientpatch upstream:

- `memory` stream: project local MEMORY (player flags, activelist, scalars)
  and emit a clientedit so the server reverse-projects it back into the
  canonical MEMORY.
- `board:<id>` streams: project the local board codepage and emit a
  clientedit for it. Only streams the worker is admitted to (i.e. has a
  registered `jsonsyncclient` stream) participate; other dirty streams are
  silently dropped because the worker has nothing to push to.

The worker's hub also receives `serverpatch`/`snapshot`/`antipatch` traffic
for these streams; hydration of those is handled separately by
`memoryhydrate`. Hydration runs inside `memorywithsilentwrites`, so it
never re-fires the bits this push loop consumes.
*/
import { rxreplpushbatch } from 'zss/device/api'
import {
  jsonsyncclientdevice,
  jsonsyncclientedit,
  jsonsyncclientreadownplayer,
  jsonsyncclientreadstream,
} from 'zss/device/jsonsyncclient'
import { zssrxrepldocumentmode } from 'zss/device/rxrepl/flags'
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
    if (!ispresent(jsonsyncclientreadstream(streamid))) {
      // not admitted yet — re-queue so admission + next tick still pushes.
      memorymarkdirty(streamid)
      continue
    }
    if (streamid === MEMORY_STREAM_ID) {
      const projection = projectmemory()
      if (zssrxrepldocumentmode()) {
        rxreplpushbatch(jsonsyncclientdevice, jsonsyncclientreadownplayer(), {
          rows: [{ streamid, document: projection }],
        })
      } else {
        jsonsyncclientedit(streamid, () => projection)
      }
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
    if (zssrxrepldocumentmode()) {
      rxreplpushbatch(jsonsyncclientdevice, jsonsyncclientreadownplayer(), {
        rows: [{ streamid, document: projection }],
      })
    } else {
      jsonsyncclientedit(streamid, () => projection)
    }
  }
}
