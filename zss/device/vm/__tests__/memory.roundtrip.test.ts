/*
phase 2 round-trip coverage: a worker-side flag mutation reaches the
server's authoritative MEMORY (and the server's `memory` jsonsync stream)
within one tick.

The chain under test:

  worker memorywritebookflag
    -> memorymarkmemorydirty
    -> memoryworkerpushdirty
       -> projectmemory + jsonsyncclientedit
          -> client stream emits a JSONSYNC_PATCH (captured here from the
             worker's local jsonsyncclient stream by re-diffing shadow vs
             current MEMORY projection)
             -> jsonsyncserveraccept
             -> memorysyncreverseproject
                -> MEMORY.books.flags / server stream document reflect the
                   patch

We do NOT route through the device bus here. The bus path needs the
worker's outbound jsonsync messages to identify themselves with a player
id (so the server can pick the right per-player shadow). Today the worker
emits with `message.player === ''`, which the server then rejects as
`unknownclient`. That gap is tracked alongside the cross-board handoff
work; this test stays focused on the data-flow chain so we don't block
phase 2 verification on it.
*/
import { jsonsyncclientreadstreams } from 'zss/device/jsonsyncclient'
import {
  jsonsyncawaitclientpersistqueue,
  jsonsyncflushclientdbfortests,
} from 'zss/device/jsonsyncdb'
import {
  JSONSYNC_PATCH,
  jsonsyncclientapplysnapshot,
  jsonsynccreateclientstream,
  jsonsynccreateserverstream,
  jsonsyncserveraccept,
  jsonsyncserveradmit,
} from 'zss/feature/jsonsync'
import { ispresent } from 'zss/mapping/types'
import { memorywritebookflag } from 'zss/memory/bookoperations'
import { MEMORY_STREAM_ID, memorydirtyclear } from 'zss/memory/memorydirty'
import {
  memoryreadbookbyaddress,
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { BOOK, MEMORY_LABEL } from 'zss/memory/types'

import { MEMORY_SYNC_TOPKEYS, projectmemory } from '../memoryproject'
import { memorysyncreverseproject } from '../memorysync'
import { memoryworkerpushdirty } from '../memoryworkersync'

function makebook(): BOOK {
  return {
    id: 'main-id',
    name: 'main',
    timestamp: 0,
    activelist: ['p1'],
    pages: [],
    flags: { p1: { board: 'boardA' } },
  }
}

describe('phase 2 worker -> server round-trip', () => {
  beforeEach(async () => {
    memoryresetbooks([makebook()])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, 'main-id')
    memorydirtyclear()
    jsonsyncclientreadstreams().clear()
    await jsonsyncawaitclientpersistqueue()
    await jsonsyncflushclientdbfortests()
  })

  afterEach(async () => {
    memoryresetbooks([])
    memorydirtyclear()
    jsonsyncclientreadstreams().clear()
    await jsonsyncawaitclientpersistqueue()
    await jsonsyncflushclientdbfortests()
  })

  it('worker flag mutation lands in MEMORY via clientpatch + reverseproject', () => {
    // 1. Build a server stream from the current MEMORY projection. We use
    //    the same options memorysyncensureregistered uses so the topkeys
    //    allowlist matches production.
    let serverstream = jsonsynccreateserverstream(projectmemory(), {
      topkeys: [...MEMORY_SYNC_TOPKEYS],
    })
    const admit = jsonsyncserveradmit(serverstream, 'p1', true)
    serverstream = admit.stream

    // 2. Hydrate a client-side stream from the server snapshot. Production
    //    routes this through the device bus; the test bypasses the bus by
    //    pushing the snapshot straight into jsonsyncclient.streams (the
    //    worker side of `memoryworkerpushdirty`).
    const clientstream = jsonsyncclientapplysnapshot(
      jsonsynccreateclientstream(),
      { ...admit.snapshot, streamid: MEMORY_STREAM_ID },
    )
    jsonsyncclientreadstreams().set(MEMORY_STREAM_ID, clientstream)

    // 3. Worker mutates a player flag — marks `memory` dirty.
    const book = memoryreadbookbyaddress('main-id')
    expect(book).toBeDefined()
    if (!ispresent(book)) {
      return
    }
    memorywritebookflag(book, 'p1', 'hp', 7)

    // 4. Drain the dirty set. memoryworkerpushdirty calls jsonsyncclientedit
    //    on the memory stream; that updates the local stream's shadow/cv
    //    and emits jsonsyncclientpatch over the bus. The bus emit has
    //    `message.player === ''` today, so we don't try to feed it back
    //    through the bus (see file header). Instead, we recover the patch
    //    from the local stream by re-diffing the previous shadow against
    //    the new shadow (which is exactly what jsonsyncclientlocalupdate
    //    already produced).
    const previousshadow = clientstream.shadow
    memoryworkerpushdirty()
    const localstream = jsonsyncclientreadstreams().get(MEMORY_STREAM_ID)
    expect(localstream).toBeDefined()
    if (!ispresent(localstream)) {
      return
    }
    expect(localstream.cv).toBe(1)

    // 5. Reconstruct the patch the worker just shipped (same shadow ->
    //    same diff -> same Changeset jsonsyncclientlocalupdate produced).
    //    The `cv` / `sv` on the shipped patch are the pre-edit values
    //    (cv: 0, sv: 0), since cv only bumps after the patch is built.
    const reconstructedpatch: JSONSYNC_PATCH = {
      streamid: MEMORY_STREAM_ID,
      cv: 0,
      sv: 0,
      changes: diffshadow(previousshadow, localstream.shadow),
    }
    expect(reconstructedpatch.changes.length).toBeGreaterThan(0)

    // 6. Apply the patch on the server side. jsonsyncserveraccept mutates
    //    the server stream's document; memorysyncreverseproject merges it
    //    into MEMORY (a no-op against the shared singleton, but exercises
    //    the path so any future divergence shows up immediately).
    const accepted = jsonsyncserveraccept(
      serverstream,
      'p1',
      reconstructedpatch,
    )
    expect(accepted.kind).toBe('ok')
    if (accepted.kind !== 'ok') {
      return
    }
    serverstream = accepted.stream
    memorysyncreverseproject(MEMORY_STREAM_ID, serverstream.document)

    // 7. End state: MEMORY has the flag, server stream document has it,
    //    and reverse-projection didn't corrupt the live book.
    const finalbook = memoryreadbookbyaddress('main-id')
    expect(finalbook?.flags.p1).toEqual({ board: 'boardA', hp: 7 })
    const docflags = (
      serverstream.document as {
        books: Record<string, { flags: Record<string, unknown> }>
      }
    ).books['main-id'].flags
    expect(docflags.p1).toEqual({ board: 'boardA', hp: 7 })
  })
})

// thin wrapper over the json-diff-ts diff path. We need to import diff
// lazily so it picks up the same module instance jsonsync uses internally.
function diffshadow(before: unknown, after: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { diff } = require('json-diff-ts') as {
    diff: (a: unknown, b: unknown) => unknown[]
  }
  return diff(before, after) as JSONSYNC_PATCH['changes']
}
