import { createdevice } from 'zss/device'
import { memorytickmain } from 'zss/memory/runtime'
import { memoryreadhalt, memoryreadsimfreeze } from 'zss/memory/session'
import { perfmeasure } from 'zss/perf/ui'

import { JSONSYNC_CHANGED } from './api'
import { memoryhydratefromjsonsync } from './vm/memoryhydrate'
import { memoryworkerpushdirty } from './vm/memoryworkersync'

// run our local authoritative tick. memoryreadbookplayerboards filters by
// `memoryreadboardbyaddress`, which only resolves boards the worker has
// hydrated via `board:<id>` snapshots — i.e. boards we were elected to run.
// `memoryreadhalt()` is forwarded as `playeronly` so #dev gating matches the
// server. `memoryreadsimfreeze()` short-circuits the whole tick to keep the
// worker quiet during async loads. After the tick, drain whatever per-stream
// dirty bits the tick produced and emit jsonsyncclientedit upstream.
function runworkertick(): void {
  if (memoryreadsimfreeze()) {
    return
  }
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
        // this never re-fires the worker dirty bits. Phase 4 task
        // `phase4-cleanup-changed-log` decides whether this debug log stays
        // after Phase 2 lands.
        memoryhydratefromjsonsync(payload.streamid, payload.document)
        console.info(
          `[boardrunner] jsonsync ${payload.streamid} ${payload.reason} cv=${payload.cv} sv=${payload.sv}`,
        )
        break
      }
      case 'ticktock':
        runworkertick()
        break
      case 'second':
        break
      default:
        break
    }
  },
)
