import { createdevice } from 'zss/device'
import {
  gadgetclearscroll,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { ispid } from 'zss/mapping/guid'
import { ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadbookflag,
  memoryreadbookflags,
} from 'zss/memory/bookoperations'
import { memorymarkmemorydirty } from 'zss/memory/memorydirty'
import { memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadoperator,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

import { JSONSYNC_CHANGED, vmclearscroll } from './api'
import {
  boardrunnergadgetclearsyncbaseline,
  boardrunnergadgetdesyncpaint,
  boardrunnergadgetsynctick,
} from './boardrunnergadget'
import { pilottick } from './vm/handlers/pilot'
import { memoryhydratefromjsonsync } from './vm/memoryhydrate'
import { memoryworkerpushdirty } from './vm/memoryworkersync'

// the boardrunner worker is authoritative for elected player boards, so chip
// aftertick writes (sidebar / scroll) produced by RUNTIME_FIRMWARE must land
// in mainbook.flags[GADGETSTORE] (same shape as sim gadgetmemoryprovider.ts)
// and mark the memory stream dirty. memoryworkerpushdirty then ships the update
// to the sim. this worker diffs gadgetstate(player) each tick and emits
// gadgetclientpatch / paint to the client. without this provider the default
// tempgadgetstate map in zss/gadget/data/api.ts would swallow every write.
gadgetstateprovider((element) => {
  if (ispid(element)) {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    // cheating here as data is non-WORD compliant
    const gadgetstore = memoryreadbookflags(
      mainbook,
      MEMORY_LABEL.GADGETSTORE,
    ) as any
    let value = gadgetstore[element]
    if (!ispresent(value)) {
      gadgetstore[element] = value = initstate()
    }
    memorymarkmemorydirty()
    return value
  }
  return initstate()
})

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
  perfmeasure('boardrunner:gadgetrender', () => {
    if (memoryreadoperator()) {
      const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
      const activelistvalues = new Set<string>(mainbook?.activelist ?? [])
      activelistvalues.add(memoryreadoperator())
      boardrunnergadgetsynctick(dev, [...activelistvalues])
    }
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
        const streamid =
          typeof payload.streamid === 'string' ? payload.streamid : ''
        const isboardstream =
          streamid.length > 0 && streamid.startsWith('board:')
        // Hydrate the worker-local MEMORY singleton from every accepted
        // jsonsync mutation (snapshot / serverpatch / antipatch).
        // memoryhydratefromjsonsync runs inside memorywithsilentwrites, so
        // this never re-fires the worker dirty bits.
        memoryhydratefromjsonsync(payload.streamid, payload.document)
        // Board tiles can mutate in place; gadget slim diff baseline may still
        // compare equal to the new export so the client never gets a patch.
        // Drop baseline for anyone standing on this board so the next tick
        // re-diffs from scratch (empty compare storms after in-place tile edits).
        if (isboardstream) {
          const boardaddress = streamid.slice('board:'.length)
          const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
          let clearedgadgetbaseline = false
          if (ispresent(mainbook?.activelist)) {
            const players = new Set<string>(mainbook.activelist)
            const op = memoryreadoperator()
            if (isstring(op) && op.length > 0) {
              players.add(op)
            }
            const playerlist = [...players]
            for (let p = 0; p < playerlist.length; ++p) {
              const player = playerlist[p]
              const bf = memoryreadbookflag(mainbook, player, 'board')
              if (isstring(bf) && bf === boardaddress) {
                boardrunnergadgetclearsyncbaseline(player)
                clearedgadgetbaseline = true
              }
            }
          }
          if (clearedgadgetbaseline && isstring(memoryreadoperator())) {
            const activelistvalues = new Set<string>(mainbook?.activelist ?? [])
            activelistvalues.add(memoryreadoperator())
            boardrunnergadgetsynctick(boardrunner, [...activelistvalues])
          }
        }
        break
      }
      case 'ticktock':
        runworkertick(boardrunner)
        break
      case 'second':
        break
      case 'desync':
        boardrunnergadgetdesyncpaint(boardrunner, message.player)
        break
      case 'clearscroll':
        gadgetclearscroll(message.player)
        memorymarkmemorydirty()
        vmclearscroll(boardrunner, message.player)
        break
      default:
        break
    }
  },
)
