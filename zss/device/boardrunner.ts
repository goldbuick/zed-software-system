import { createdevice } from 'zss/device'
import {
  gadgetclearscroll,
  gadgetmarkdirty,
  gadgetstate,
} from 'zss/gadget/data/api'
import { GADGET_STATE, INPUT, PANEL_ITEM } from 'zss/gadget/data/types'
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadboardbyaddress,
  memoryreadoverboard,
} from 'zss/memory/boards'
import { memoryreadbookflag } from 'zss/memory/bookoperations'
import { memoryhasflags, memoryreadflags } from 'zss/memory/flags'
import { MEMORY_STREAM_ID, memorymarkmemorydirty } from 'zss/memory/memorydirty'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import {
  MEMORY_GADGET_LAYERS,
  memoryconverttogadgetcontrollayer,
  memoryreadgadgetlayers,
} from 'zss/memory/rendering'
import { memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadoperator,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { memoryreadsynth } from 'zss/memory/synthstate'
import { BOARD, BOOK, MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

import { JSONSYNC_CHANGED, MESSAGE, vmclearscroll } from './api'
import {
  handlepilotclear,
  handlepilotstart,
  handlepilotstop,
  pilottick,
} from './vm/handlers/pilot'
import { memoryhydratefromjsonsync } from './vm/memoryhydrate'
import { memoryworkerpushdirty } from './vm/memoryworkersync'

function shouldboardrunnerhandlestreamchanged(target: string): boolean {
  if (target === `${MEMORY_STREAM_ID}:changed`) {
    return true
  }
  if (!target.endsWith(':changed')) {
    return false
  }
  const streamid = target.slice(0, -':changed'.length)
  return streamid.startsWith('board:')
}

// jsonsync resync + gadget baselines treat both layers as ours.
let assignedboardid = ''
let assignedplayerid = ''
export function setassignedplayerid(player: string) {
  assignedplayerid = player
}

/** Mid + optional over board id derived from `assignedboardid` + MEMORY. */
const ownedboardids = new Set<string>()

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

function rendergadgetlayers(
  gadget: GADGET_STATE,
  player: string,
  board: BOARD,
  layers: MEMORY_GADGET_LAYERS,
) {
  const control = memoryconverttogadgetcontrollayer(player, 1000, board)
  gadget.id = layers.id
  gadget.board = layers.board
  gadget.exiteast = layers.exiteast
  gadget.exitwest = layers.exitwest
  gadget.exitnorth = layers.exitnorth
  gadget.exitsouth = layers.exitsouth
  gadget.exitne = layers.exitne
  gadget.exitnw = layers.exitnw
  gadget.exitse = layers.exitse
  gadget.exitsw = layers.exitsw
  gadget.over = layers.over
  gadget.under = layers.under
  gadget.layers = [...layers.layers, ...control]
  gadget.tickers = layers.tickers
  gadget.boardname = board.name?.trim() ?? ''
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

  perfmeasure('boardrunner:rendergadgetlayers', () => {
    // render the board visuals
    const playerboard = memoryreadplayerboard(assignedplayerid)
    if (ispresent(playerboard)) {
      // read A/V state
      const synthstate = memoryreadsynth(playerboard.id ?? '')
      const gadgetlayers = memoryreadgadgetlayers(assignedplayerid, playerboard)
      // build layers for each player
      for (let i = 0; i < players.length; ++i) {
        const player = players[i]
        const gadget = gadgetstate(player)
        gadget.synthstate = synthstate
        rendergadgetlayers(gadget, player, playerboard, gadgetlayers)
        gadgetmarkdirty(player)
      }
    }
  })

  perfmeasure('boardrunner:memoryworkerpushdirty', () => {
    memoryworkerpushdirty()
  })
}

const boardrunner = createdevice(
  'boardrunner',
  ['ticktock', 'memory', 'board'],
  (message) => {
    if (!boardrunner.session(message)) {
      return
    }

    // filter messages by target
    switch (message.target) {
      case 'ticktock':
        break
      default:
        if (shouldboardrunnerhandlestreamchanged(message.target)) {
          break
        }
        // everything else is filtered by assignedplayerid
        if (message.player !== assignedplayerid) {
          if (import.meta.env.DEV) {
            console.info('filtered message', message.target, message)
          }
          return
        }
        break
    }

    // handle messages
    if (shouldboardrunnerhandlestreamchanged(message.target)) {
      const payload = message.data as JSONSYNC_CHANGED
      memoryhydratefromjsonsync(payload.streamid, payload.document)
      rebuildownedboardids()
      return
    }

    switch (message.target) {
      case 'ticktock':
        runworkertick(boardrunner)
        break
      case 'ownedboard': {
        const next = isstring(message.data) ? message.data : ''
        const prev = assignedboardid
        if (prev === next) {
          break
        }
        assignedboardid = next
        rebuildownedboardids()
        if (import.meta.env.DEV) {
          console.info('updated ownedboard', assignedplayerid, assignedboardid)
        }
        break
      }
      case 'clearscroll': {
        gadgetclearscroll(message.player)
        vmclearscroll(boardrunner, message.player)
        break
      }
      // case 'gadgetscrollpush': {
      //   // const payload = message.data as BOARDRUNNER_GADGETSCROLLPUSH | undefined
      //   // const player = isstring(payload?.player) ? payload.player : ''
      //   // if (!player) {
      //   //   break
      //   // }
      //   // const shared = gadgetstate(player)
      //   // shared.scrollname = isstring(payload?.scrollname)
      //   //   ? payload.scrollname
      //   //   : ''
      //   // shared.scroll = (
      //   //   isarray(payload?.scroll) ? payload.scroll : []
      //   // ) as PANEL_ITEM[]
      //   // boardrunnergadgetpushnow(player, false)
      //   break
      // }
      default:
        break
    }
  },
)

function handleworkeruserinput(message: MESSAGE): void {
  if (!memoryhasflags(message.player)) {
    return
  }
  const flags = memoryreadflags(message.player)
  const [input = INPUT.NONE, mods = 0] = message.data ?? [INPUT.NONE, 0]
  if (!isarray(flags.inputqueue)) {
    flags.inputqueue = []
  }
  if (input !== INPUT.NONE) {
    flags.inputqueue.push([input, mods])
  }
}

const user = createdevice('user', [], (message) => {
  if (!user.session(message)) {
    return
  }
  switch (message.target) {
    case 'input':
      handleworkeruserinput(message)
      break
    case 'pilotstart':
      handlepilotstart(message)
      break
    case 'pilotstop':
      handlepilotstop(message)
      break
    case 'pilotclear':
      handlepilotclear(message)
      break
    default:
      break
  }
})
