import { createdevice } from 'zss/device'
import {
  gadgetclearscroll,
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { ispid } from 'zss/mapping/guid'
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadboardbyaddress,
  memoryreadoverboard,
} from 'zss/memory/boards'
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
import { BOOK, MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

import {
  BOARDRUNNER_GADGETSCROLLPUSH,
  JSONSYNC_CHANGED,
  vmclearscroll,
} from './api'
import {
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

// Election sends one codepage id (`boardrunner:ownedboard`). The runner may
// authoritatively touch one or two `board:<id>` streams: the mid board and,
// when present, its overboard (see BOARD.over → memoryreadoverboard). We
// expand the assigned id into `ownedboardids` whenever MEMORY hydrates so
// jsonsync resync + gadget baselines treat both layers as ours.
let assignedboardid = ''

/** Mid + optional over board id derived from `assignedboardid` + MEMORY. */
const ownedboardids = new Set<string>()

/** Owned `board:<id>` streams that hydrated this batch; gadget baseline coalesced to next ticktock. */
// const pendingOwnedBoardGadgetResync = new Set<string>()

function snapshotownedids(assigned: string): Set<string> {
  const ids = new Set<string>()
  if (!isstring(assigned) || assigned.length === 0) {
    return ids
  }
  ids.add(assigned)
  const mid = memoryreadboardbyaddress(assigned)
  if (!ispresent(mid)) {
    return ids
  }
  const over = memoryreadoverboard(mid)
  if (ispresent(over?.id) && over.id.length > 0) {
    ids.add(over.id)
  }
  return ids
}

function rebuildownedboardids() {
  ownedboardids.clear()
  if (!isstring(assignedboardid) || assignedboardid.length === 0) {
    return
  }
  snapshotownedids(assignedboardid).forEach((id) => ownedboardids.add(id))
}

function playerresolvedboardid(mainbook: MAYBE<BOOK>, player: string): string {
  if (!ispresent(mainbook)) {
    return ''
  }
  const flag = memoryreadbookflag(mainbook, player, 'board')
  if (!isstring(flag)) {
    return ''
  }
  const resolved = memoryreadboardbyaddress(flag)
  return ispresent(resolved?.id) && resolved.id.length > 0 ? resolved.id : flag
}

function ownedplayerids(): string[] {
  if (ownedboardids.size === 0) {
    return []
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const active = mainbook?.activelist ?? []
  const out: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < active.length; ++i) {
    const player = active[i]
    const bid = playerresolvedboardid(mainbook, player)
    if (bid.length > 0 && ownedboardids.has(bid)) {
      out.push(player)
      seen.add(player)
    }
  }
  const op = memoryreadoperator()
  if (isstring(op) && op.length > 0 && !seen.has(op)) {
    const opbid = playerresolvedboardid(mainbook, op)
    if (opbid.length > 0 && ownedboardids.has(opbid)) {
      out.push(op)
    }
  }
  return out
}

function runworkertick(dev: ReturnType<typeof createdevice>): void {
  rebuildownedboardids()
  if (memoryreadsimfreeze()) {
    return
  }
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
  ['ticktock', 'jsonsync'],
  (message) => {
    if (!boardrunner.session(message)) {
      return
    }
    switch (message.target) {
      case 'jsonsync:changed': {
        const payload = message.data as JSONSYNC_CHANGED
        memoryhydratefromjsonsync(payload.streamid, payload.document)
        rebuildownedboardids()
        break
      }
      case 'ticktock':
        runworkertick(boardrunner)
        break
      case 'desync':
        boardrunnergadgetdesyncpaint(boardrunner, message.player)
        break
      case 'ownedboard': {
        const next = isstring(message.data) ? message.data : ''
        const prev = assignedboardid
        if (prev === next) {
          break
        }
        assignedboardid = next
        rebuildownedboardids()
        console.info('updated ownedboardids', ownedboardids)
        break
      }
      case 'clearscroll':
        gadgetclearscroll(message.player)
        memorymarkmemorydirty()
        vmclearscroll(boardrunner, message.player)
        break
      case 'gadgetscrollpush': {
        const payload = message.data as BOARDRUNNER_GADGETSCROLLPUSH | undefined
        const player = isstring(payload?.player) ? payload.player : ''
        if (!player) {
          break
        }
        const shared = gadgetstate(player)
        shared.scrollname = isstring(payload?.scrollname)
          ? payload.scrollname
          : ''
        shared.scroll = (
          isarray(payload?.scroll) ? payload.scroll : []
        ) as PANEL_ITEM[]
        break
      }
      default:
        break
    }
  },
)
