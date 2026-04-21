import { createdevice } from 'zss/device'
import {
  gadgetclearscroll,
  gadgetmarkdirty,
  gadgetstate,
} from 'zss/gadget/data/api'
import { GADGET_STATE, INPUT } from 'zss/gadget/data/types'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadboardbyaddress,
  memoryreadoverboard,
} from 'zss/memory/boards'
import { memoryhasflags, memoryreadflags } from 'zss/memory/flags'
import {
  boardstream,
  isboardstream,
  isflagsstream,
  ismemorystream,
} from 'zss/memory/memorydirty'
import {
  memoryreadplayerboard,
  memoryreadplayers,
} from 'zss/memory/playermanagement'
import {
  MEMORY_GADGET_LAYERS,
  memoryconverttogadgetcontrollayer,
  memoryreadgadgetlayers,
} from 'zss/memory/rendering'
import { memorytickmain } from 'zss/memory/runtime'
import { memoryreadfreeze, memoryreadhalt } from 'zss/memory/session'
import { memoryreadsynth } from 'zss/memory/synthstate'
import { BOARD } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

import {
  JSONSYNC_CHANGED,
  MESSAGE,
  rxreplpullrequest,
  vmclearscroll,
} from './api'
import {
  registerRxreplBoardRowAppliedCallback,
  rxreplclientdevice,
  rxreplclientreadstream,
} from './rxreplclient'
import {
  handlepilotclear,
  handlepilotstart,
  handlepilotstop,
  pilottick,
} from './vm/handlers/pilot'
import { memoryhydratefromjsonsync } from './vm/memoryhydrate'
import { memoryworkerpushdirty } from './vm/memoryworkersync'

function shouldboardrunnerhandlestreamchanged(target: string): boolean {
  if (!target.endsWith(':changed')) {
    return false
  }
  const stream = target.slice(0, -':changed'.length)
  return (
    ismemorystream(stream) || isboardstream(stream) || isflagsstream(stream)
  )
}

// jsonsync resync + gadget baselines treat both layers as ours.
let assignedboard = ''
let assignedplayer = ''
let assignedisjoinplayer = false
let pullthrottleboard = ''
let pullthrottletime = 0

/** Sim may admit `board:<id>` before the first `stream_row` reaches this worker. */
function maybeboardstreampullrequest(): void {
  if (!isstring(assignedboard) || assignedboard.length === 0) {
    pullthrottleboard = ''
    return
  }
  const sid = boardstream(assignedboard)
  if (ispresent(rxreplclientreadstream(sid))) {
    pullthrottleboard = ''
    return
  }
  if (runnerboardforrenderandsource().source !== 'none') {
    pullthrottleboard = ''
    return
  }
  if (!isstring(assignedplayer) || assignedplayer.length === 0) {
    return
  }
  const now = Date.now()
  if (pullthrottleboard === assignedboard && now - pullthrottletime < 500) {
    return
  }
  pullthrottleboard = assignedboard
  pullthrottletime = now
  rxreplpullrequest(rxreplclientdevice, assignedplayer, {
    checkpoint: null,
    streamids: [sid],
  })
}

export function setassignedplayer(player: string, isjoinplayer: boolean) {
  assignedplayer = player
  assignedisjoinplayer = isjoinplayer
}

/** Mid + optional over board id derived from `assignedboardid` + MEMORY. */
const ownedboards = new Set<string>()

function snapshotownedboards(assigned: string): Set<string> {
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
  ownedboards.clear()
  if (!isstring(assignedboard) || assignedboard.length === 0) {
    return
  }
  const next = [...snapshotownedboards(assignedboard)]
  for (let i = 0; i < next.length; ++i) {
    ownedboards.add(next[i])
  }
}

function runnerboardfromrxrepl(boardid: string): BOARD | undefined {
  const row = rxreplclientreadstream(boardstream(boardid))
  if (!row?.document || typeof row.document !== 'object') {
    return undefined
  }
  const incomingboard = (row.document as Record<string, unknown>).board
  if (!ispresent(incomingboard) || typeof incomingboard !== 'object') {
    return undefined
  }
  return incomingboard as BOARD
}

type RunnerBoardSource = 'flags' | 'memory' | 'rxrepl' | 'none'

/** Board for the elected worker: flags, then MEMORY, then rxrepl raw `.board`. */
function runnerboardforrenderandsource(): {
  board: BOARD | undefined
  source: RunnerBoardSource
} {
  const fromflags = memoryreadplayerboard(assignedplayer)
  if (ispresent(fromflags)) {
    return { board: fromflags, source: 'flags' }
  }
  if (isstring(assignedboard) && assignedboard.length > 0) {
    const stream = boardstream(assignedboard)
    let frommem = memoryreadboardbyaddress(assignedboard)
    if (!ispresent(frommem)) {
      const row = rxreplclientreadstream(stream)
      if (row?.document && typeof row.document === 'object') {
        // Worker rxrepl can have `board:<id>` before `board:<id>:changed` hydrates
        // MEMORY (hub ordering). Merge the shadow row into MEMORY and re-read.
        memoryhydratefromjsonsync(stream, row.document)
        frommem = memoryreadboardbyaddress(assignedboard)
      }
    }
    if (ispresent(frommem)) {
      return { board: frommem, source: 'memory' }
    }
    const fromrx = runnerboardfromrxrepl(assignedboard)
    if (ispresent(fromrx)) {
      return { board: fromrx, source: 'rxrepl' }
    }
  }
  return { board: undefined, source: 'none' }
}

function ownedplayers(): string[] {
  if (ownedboards.size === 0) {
    return []
  }
  const players = memoryreadplayers()
  const out = players.filter((player) => {
    const playerboard = memoryreadplayerboard(player)
    return ispresent(playerboard) && ownedboards.has(playerboard.id)
  })
  // Join (or any) client can become runner before `flags:<pid>` hydrates the
  // worker shadow; `memoryreadplayerboard` is empty so the filter would drop
  // everyone including the runner. Always admit the assigned worker pid when
  // we already own a resolved board id in `ownedboards`.
  if (
    isstring(assignedplayer) &&
    assignedplayer.length > 0 &&
    !out.includes(assignedplayer) &&
    ownedboards.size > 0
  ) {
    out.push(assignedplayer)
  }
  return out
}

function rendergadgetlayers(
  gadget: GADGET_STATE,
  player: string,
  board: BOARD,
  layers: MEMORY_GADGET_LAYERS,
) {
  const boardname = board.name?.trim() ?? ''
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
  gadget.boardname = boardname
}

function rendergadgetstate(players: string[]) {
  const { board: playerboard } = runnerboardforrenderandsource()
  if (ispresent(playerboard)) {
    // read A/V state
    const synthstate = memoryreadsynth(playerboard.id ?? '')
    const gadgetlayers = memoryreadgadgetlayers(assignedplayer, playerboard)
    // build layers for each player
    for (let i = 0; i < players.length; ++i) {
      const player = players[i]
      const gadget = gadgetstate(player)
      gadget.synthstate = synthstate
      rendergadgetlayers(gadget, player, playerboard, gadgetlayers)
      gadgetmarkdirty(player)
    }
  }
}

function runworkertick(dev: ReturnType<typeof createdevice>): void {
  rebuildownedboardids()
  maybeboardstreampullrequest()
  if (memoryreadfreeze()) {
    return
  }
  const players = ownedplayers()
  if (players.length === 0) {
    return
  }
  perfmeasure('boardrunner:pilottick', () => {
    pilottick(dev)
  })
  perfmeasure('boardrunner:memorytickmain', () => {
    memorytickmain(memoryreadhalt())
  })
  perfmeasure('boardrunner:rendergadgetstate', () => {
    rendergadgetstate(players)
  })
  perfmeasure('boardrunner:memoryworkerpushdirty', () => {
    memoryworkerpushdirty()
  })
}

let rxreplboardnotifydepth = 0
registerRxreplBoardRowAppliedCallback(() => {
  if (rxreplboardnotifydepth > 0) {
    return
  }
  rxreplboardnotifydepth++
  try {
    rebuildownedboardids()
    if (memoryreadfreeze()) {
      return
    }
    const players = ownedplayers()
    if (players.length === 0) {
      return
    }
    rendergadgetstate(players)
    memoryworkerpushdirty()
  } finally {
    rxreplboardnotifydepth--
  }
})

const boardrunner = createdevice(
  'boardrunner',
  ['ticktock', 'memory', 'flags', 'board'],
  (message) => {
    if (!boardrunner.session(message)) {
      return
    }
    // console.info('<', message)

    // filter messages by target
    const shouldhandle = shouldboardrunnerhandlestreamchanged(message.target)
    switch (message.target) {
      case 'ticktock':
        break
      default:
        // are these streams we care about?
        if (shouldhandle) {
          break
        }
        // everything else is filtered by assignedplayerid
        if (message.player !== assignedplayer) {
          if (import.meta.env.DEV) {
            console.info('filtered message', message.target, message)
          }
          return
        }
        break
    }

    // handle messages
    if (shouldhandle) {
      const payload = message.data as JSONSYNC_CHANGED
      // `streamid:changed` from jsonsyncdb uses `streamsyncchanged` → emit(..., '', target)
      // so `message.player` is always ''. Hydrate all memory/board/flags streams the
      // worker mirror holds (including neighbor boards); see host-vs-join-architecture.md.
      memoryhydratefromjsonsync(
        payload.streamid,
        payload.document,
        assignedisjoinplayer,
      )
      rebuildownedboardids()
      return
    }

    switch (message.target) {
      case 'ticktock':
        runworkertick(boardrunner)
        break
      case 'ownedboard': {
        const next = isstring(message.data) ? message.data : ''
        const prev = assignedboard
        if (prev === next) {
          break
        }
        assignedboard = next
        rebuildownedboardids()
        if (next.length > 0) {
          maybeboardstreampullrequest()
        }
        if (import.meta.env.DEV) {
          console.info('>>', assignedplayer)
          console.info('------------------', assignedboard)
        }
        break
      }
      case 'clearscroll': {
        gadgetclearscroll(message.player)
        vmclearscroll(boardrunner, message.player)
        break
      }
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
