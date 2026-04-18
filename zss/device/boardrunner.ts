import { createdevice } from 'zss/device'
import {
  gadgetclearscroll,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { ispid } from 'zss/mapping/guid'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
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
// aftertick writes (sidebar / scroll) produced by RUNTIME_FIRMWARE land in
// mainbook.flags[GADGETSTORE] (same shape as sim gadgetmemoryprovider.ts). the
// worker diffs gadgetstate(player) each tick and emits gadgetclientpatch /
// paint to the client directly — no sim-side code reads GADGETSTORE, so this
// store is worker-local and must NOT mark the memory stream dirty on access
// (that forces a ~120KB projectmemory + diff every tick). callers that need
// to round-trip other memory mutations upstream should call
// memorymarkmemorydirty() at the actual mutation site.
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
    return value
  }
  return initstate()
})

// Authoritative ownership set. Populated from the server's
// `boardrunner:ownedboards` message on every election change / ack /
// logout. The worker ONLY runs pilottick / memorytickmain / gadgetrender /
// memoryworkerpushdirty for players whose current `board` flag is in this
// set. Without this gate, every peer's worker (as soon as jsonsync admits
// it to the `board:<id>` stream) would tick the same board and emit
// conflicting paints / writes — observed as host-freezes, player-movement
// hitches, and blank screens on join.
const ownedboards = new Set<string>()

function isowned(boardid: string): boolean {
  return isstring(boardid) && ownedboards.has(boardid)
}

// For every player we're authoritative over, collect their current board
// flag. Used both to pick the `gadgetrender` player list and to gate the
// tick entirely (no owned boards with any player present => no work).
function ownedplayerids(): string[] {
  if (ownedboards.size === 0) {
    return []
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const active = mainbook?.activelist ?? []
  const out: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < active.length; ++i) {
    const player = active[i]
    const board = memoryreadbookflag(mainbook, player, 'board')
    if (isstring(board) && isowned(board)) {
      out.push(player)
      seen.add(player)
    }
  }
  // Ensure the operator is always considered (they may not be in activelist
  // on a fresh boot) if their board is owned.
  const op = memoryreadoperator()
  if (isstring(op) && op.length > 0 && !seen.has(op)) {
    const opboard = memoryreadbookflag(mainbook, op, 'board')
    if (isstring(opboard) && isowned(opboard)) {
      out.push(op)
    }
  }
  return out
}

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
  // Pre-ownership: if we don't own any board with an active player on it,
  // there is nothing authoritative to do. Skip pilot/tickmain/paint/push to
  // keep non-elected workers idle — crucial when multiple peers share the
  // same jsonsync admissions during an election flip.
  const players = ownedplayerids()
  if (players.length === 0) {
    return
  }
  perfmeasure('boardrunner:pilottick', () => {
    pilottick(dev)
  })
  perfmeasure('boardrunner:memorytickmain', () => {
    memorytickmain(memoryreadhalt())
  })
  perfmeasure('boardrunner:gadgetrender', () => {
    boardrunnergadgetsynctick(dev, players)
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
        // Non-owners still need full neighbor-board hydration for exit
        // previews; a shallower merge is a future perf win if profiling shows
        // hotspot pressure here.
        memoryhydratefromjsonsync(payload.streamid, payload.document)
        // Board tiles can mutate in place; gadget slim diff baseline may still
        // compare equal to the new export so the client never gets a patch.
        // Drop baseline for anyone standing on this board so the next tick
        // re-diffs from scratch (empty compare storms after in-place tile edits).
        if (isboardstream) {
          const boardaddress = streamid.slice('board:'.length)
          // Only clear baselines and trigger an immediate repaint for this
          // board when the worker owns it. Non-owners observe this stream
          // only so they can stay hydrated for cross-board reads (cardinal
          // / diagonal neighbor preview), not because they should paint.
          if (!isowned(boardaddress)) {
            break
          }
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
          if (clearedgadgetbaseline) {
            const paintplayers = ownedplayerids()
            if (paintplayers.length > 0) {
              boardrunnergadgetsynctick(boardrunner, paintplayers)
            }
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
      case 'ownedboards': {
        const incoming = isarray(message.data)
          ? (message.data as unknown[]).filter(isstring)
          : []
        const next = new Set<string>(incoming)
        // Determine added / removed boards so we can clear gadget baselines
        // and (for newly-owned boards) trigger an immediate repaint once
        // MEMORY has hydrated. Players are considered for repaint only if
        // their current board flag matches a newly-owned board.
        const added: string[] = []
        const removed: string[] = []
        next.forEach((b) => {
          if (!ownedboards.has(b)) {
            added.push(b)
          }
        })
        ownedboards.forEach((b) => {
          if (!next.has(b)) {
            removed.push(b)
          }
        })
        ownedboards.clear()
        next.forEach((b) => ownedboards.add(b))
        if (removed.length > 0 || added.length > 0) {
          // Clear baselines for affected players so the next paint or the
          // immediate paint below starts from scratch (no stale diff
          // against a previous owner's gadget state).
          const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
          const active = mainbook?.activelist ?? []
          const affected: string[] = []
          for (let i = 0; i < active.length; ++i) {
            const player = active[i]
            const board = memoryreadbookflag(mainbook, player, 'board')
            if (!isstring(board)) {
              continue
            }
            if (added.includes(board) || removed.includes(board)) {
              boardrunnergadgetclearsyncbaseline(player)
              if (added.includes(board)) {
                affected.push(player)
              }
            }
          }
          if (affected.length > 0) {
            // Paint immediately so the client sees a full refresh on the
            // tick we gain ownership rather than waiting for the next
            // ticktock. The worker may not have MEMORY hydrated yet for
            // the owned board; boardrunnergadgetsynctick guards against
            // missing playerboard on its own.
            boardrunnergadgetsynctick(boardrunner, affected)
          }
        }
        break
      }
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
