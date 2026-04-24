/*
memoryhydrate: worker-side bridge between jsonsync streams and the local
MEMORY singleton.

Counterpart to `memorysync.ts`. memorysync runs on the SERVER (simspace) and
projects MEMORY -> jsonsync streams + reverse-projects accepted client patches
back into MEMORY. memoryhydrate runs on a CLIENT process (boardrunner worker)
and applies inbound jsonsync snapshots & patches into that worker's local
MEMORY singleton, creating books/pages on the fly.

Differences vs server-side reverseproject:
- The worker may receive a snapshot for a book it has never seen before;
  hydrate must create it (memorywritebook) instead of skipping.
- The `memory` stream lists every codepage; BOARD rows are **shells** (id,
  code, stats.type). A `board:<id>` snapshot carries the playable BOARD body;
  it can arrive before or after the shell and uses `hydrateboard` to attach
  terrain/objects and run `memoryinitboard` for runtime caches.
- All writes are wrapped in `memorywithsilentwrites` so server-driven
  hydration never re-marks the just-applied stream dirty (which would loop
  the change right back upstream).

Worker DOES still mark dirty when its own local tick mutates state — those
writes happen outside hydration and feed `memorysyncpushdirty` on the worker
side (see phase2-worker-emit-patches).

Stream dispatch is shared with sim reverse-projection via
`routememoryjsonsyncdocument` in `memoryproject.ts` (hydrate vs unproject).
*/
import { ispresent } from 'zss/mapping/types'
import { memorywithsilentwrites } from 'zss/memory/memorydirty'

import { routememoryjsonsyncdocument } from './memoryproject'

export {
  BOOK_WIRE_SCALAR_KEYS,
  mergebookpagesfrommemoryprojection,
} from './memorywiremerge'

export {
  hydrateboard,
  hydrategadget,
  hydratememory,
  hydrateplayerflags,
} from './memoryhydrateimpl'

export function memoryhydratefromjsonsync(
  stream: string,
  document: unknown,
): void {
  if (!ispresent(document) || typeof document !== 'object') {
    return
  }
  memorywithsilentwrites(() => {
    routememoryjsonsyncdocument(stream, document as Record<string, unknown>, {
      mode: 'hydrate',
    })
  })
}
