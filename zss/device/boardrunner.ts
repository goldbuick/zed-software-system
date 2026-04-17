import { createdevice } from 'zss/device'
import { memorytickmain } from 'zss/memory/runtime'
import { memoryreadhalt, memoryreadsimfreeze } from 'zss/memory/session'
import { perfmeasure } from 'zss/perf/ui'

import { JSONSYNC_CHANGED } from './api'
import { pilottick } from './vm/handlers/pilot'
import { memoryhydratefromjsonsync } from './vm/memoryhydrate'
import { memoryworkerpushdirty } from './vm/memoryworkersync'

// run our local authoritative tick. memoryreadbookplayerboards filters by
// `memoryreadboardbyaddress`, which only resolves boards the worker has
// hydrated via `board:<id>` snapshots — i.e. boards we were elected to run.
// `memoryreadhalt()` is forwarded as `playeronly` so #dev gating matches the
// server. `memoryreadsimfreeze()` short-circuits the whole tick to keep the
// worker quiet during async loads. pilot ticks moved here from the server
// (boardrunner authoritative-tick plan) — pilot synthesizes inputs onto
// flags.inputqueue, which the firmware then consumes during memorytickmain.
// After the tick, drain per-stream dirty bits and emit jsonsyncclientedit
// upstream.
function runworkertick(dev: ReturnType<typeof createdevice>): void {
  if (memoryreadsimfreeze()) {
    return
  }
  perfmeasure('boardrunner:pilottick', () => {
    pilottick(dev)
  })
  perfmeasure('boardrunner:memorytickmain', () => {
    memorytickmain(memoryreadhalt())
  })
  perfmeasure('boardrunner:memoryworkerpushdirty', () => {
    memoryworkerpushdirty()
  })
}

const boardrunner = createdevice(
  'boardrunner',
  ['second', 'ticktock', 'jsonsync'],
  (message) => {
    if (!boardrunner.session(message)) {
      return
    }
    switch (message.target) {
      case 'jsonsync:changed': {
        const payload = message.data as JSONSYNC_CHANGED
        // Hydrate the worker-local MEMORY singleton from every accepted
        // jsonsync mutation (snapshot / serverpatch / antipatch).
        // memoryhydratefromjsonsync runs inside memorywithsilentwrites, so
        // this never re-fires the worker dirty bits.
        memoryhydratefromjsonsync(payload.streamid, payload.document)
        break
      }
      case 'ticktock':
        runworkertick(boardrunner)
        break
      case 'second':
        break
      default:
        break
    }
  },
)
